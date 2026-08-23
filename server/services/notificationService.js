const Notification =
  require('../models/Notification');

const {
  User
} =
  require('../models/User');

const {
  sendEmail
} =
  require('./emailService');

/*
|--------------------------------------------------------------------------
| Email subject by notification type
|--------------------------------------------------------------------------
*/

const SUBJECTS = {
  welcome:
    'Welcome to BloodBridge',

  match:
    'BloodBridge — Blood Request Match',

  sos:
    'URGENT: BloodBridge Emergency SOS',

  status_update:
    'BloodBridge — Request Update',

  reminder:
    'BloodBridge Reminder',

  general:
    'BloodBridge Notification'
};

/*
|--------------------------------------------------------------------------
| Create one notification + optionally email
|--------------------------------------------------------------------------
*/

async function notifyUser({
  userId,
  message,
  type = 'general',
  subject = null,
  email = true,
  eventKey = null
}) {
  if (!userId || !message) {
    return null;
  }

  /*
   * eventKey prevents the same event from creating duplicate notifications.
   */
  if (eventKey) {
    const existing =
      await Notification.findOne({
        userId,
        eventKey
      });

    if (existing) {
      return {
        notification:
          existing,

        created:
          false,

        emailSent:
          false
      };
    }
  }

  const notification =
    await Notification.create({
      userId,
      message,
      type,
      eventKey
    });

  let emailResult = null;

  if (email) {
    const user =
      await User.findById(
        userId
      ).select(
        'name email isActive'
      );

    if (
      user &&
      user.isActive &&
      user.email
    ) {
      emailResult =
        await sendEmail({
          to:
            user.email,

          subject:
            subject ||
            SUBJECTS[type] ||
            SUBJECTS.general,

          text:
            message
        });
    }
  }

  return {
    notification,

    created:
      true,

    emailSent:
      Boolean(
        emailResult?.sent
      )
  };
}

/*
|--------------------------------------------------------------------------
| In-app only
|--------------------------------------------------------------------------
*/

async function createInAppNotification(
  userId,
  message,
  type = 'general',
  eventKey = null
) {
  return notifyUser({
    userId,
    message,
    type,
    eventKey,
    email: false
  });
}

/*
|--------------------------------------------------------------------------
| Broadcast to active users
|--------------------------------------------------------------------------
|
| Each recipient gets:
|
| - their own Notification document
| - their own email
|
| We DO NOT expose everybody's address in one giant "To:" list.
|--------------------------------------------------------------------------
*/

async function broadcastToActiveUsers({
  message,
  type = 'general',
  subject = null,
  eventKey = null,
  filter = {}
}) {
  const users =
    await User.find({
      isActive: true,
      ...filter
    }).select(
      '_id name email role'
    );

  const results = [];

  /*
   * Run independently so one invalid email cannot stop everybody else.
   */
  const deliveries =
    await Promise.allSettled(
      users.map(
        (user) =>
          notifyUser({
            userId:
              user._id,

            message,

            type,

            subject,

            email:
              true,

            eventKey:
              eventKey
                ? `${eventKey}:${user._id}`
                : null
          })
      )
    );

  deliveries.forEach(
    (delivery, index) => {
      results.push({
        userId:
          users[index]._id,

        status:
          delivery.status,

        result:
          delivery.status ===
          'fulfilled'
            ? delivery.value
            : null,

        error:
          delivery.status ===
          'rejected'
            ? delivery.reason
                ?.message
            : null
      });
    }
  );

  return results;
}

/*
|--------------------------------------------------------------------------
| Notify matched donors
|--------------------------------------------------------------------------
*/

async function notifyMatchedDonors({
  request,
  matches
}) {
  if (
    !request ||
    !Array.isArray(matches)
  ) {
    return [];
  }

  const jobs =
    matches.map(
      (match) => {
        const message =
          `You have been matched to an ${request.urgency || ''} ` +
          `blood request for ${request.patientName}. ` +
          `Blood group: ${request.bloodGroup}. ` +
          `Request ID: ${request.publicId || request._id}. ` +
          `Open BloodBridge to respond.`;

        return notifyUser({
          userId:
            match.donorId,

          message,

          type:
            'match',

          subject:
            `BloodBridge Match — ${request.bloodGroup} Blood Needed`,

          eventKey:
            `match:${request._id}:${match.donorId}`
        });
      }
    );

  return Promise.allSettled(
    jobs
  );
}

/*
|--------------------------------------------------------------------------
| Role-specific registration welcome
|--------------------------------------------------------------------------
*/

function buildWelcomeMessage(
  user
) {
  const firstLine =
    `Welcome to BloodBridge, ${user.name}. Your ${user.role} account has been created successfully.`;

  switch (user.role) {
    case 'Donor':
      return (
        `${firstLine}\n\n` +
        `Your BloodBridge Donor ID is ${user.publicId || 'available from your donor profile'}.\n` +
        `You can manage your availability, view matched requests, log donations, and view your donation history.`
      );

    case 'Patient':
      return (
        `${firstLine}\n\n` +
        `You can create and track blood requests, search registered donors, and view donor history. ` +
        `If you also wish to donate blood, use "Register as Blood Donor" from the Donors page.`
      );

    case 'Hospital':
      return (
        `${firstLine}\n\n` +
        `You can create blood requests, coordinate donor matching, verify fulfillment, and use institutional BloodBridge features.`
      );

    case 'BloodBank':
      return (
        `${firstLine}\n\n` +
        `You can manage blood inventory, coordinate matching, record verified donations, and confirm request fulfillment.`
      );

    default:
      return firstLine;
  }
}

/*
|--------------------------------------------------------------------------
| Welcome notification
|--------------------------------------------------------------------------
*/

async function sendWelcomeNotification(
  user
) {
  if (!user) {
    return null;
  }

  return notifyUser({
    userId:
      user._id,

    message:
      buildWelcomeMessage(
        user
      ),

    type:
      'welcome',

    subject:
      `Welcome to BloodBridge, ${user.name}`,

    eventKey:
      `welcome:${user._id}`
  });
}

/*
|--------------------------------------------------------------------------
| SOS broadcast
|--------------------------------------------------------------------------
*/

async function broadcastSOS(
  request
) {
  if (!request) {
    return [];
  }

  const area =
    request.location?.address ||
    request.hospitalName ||
    'location available inside BloodBridge';

  const message =
    `EMERGENCY BLOOD SOS\n\n` +
    `${request.bloodGroup} blood is urgently needed for ${request.patientName}.\n` +
    `Units required: ${request.unitsNeeded}\n` +
    `Hospital/Area: ${area}\n` +
    `${
      request.contactPhone
        ? `Contact: ${request.contactPhone}\n`
        : ''
    }` +
    `Request ID: ${request.publicId || request._id}\n\n` +
    `Please open BloodBridge immediately if you may be able to help.`;

  return broadcastToActiveUsers({
    message,

    type:
      'sos',

    subject:
      `URGENT Blood SOS — ${request.bloodGroup} Needed`,

    eventKey:
      `sos:${request._id}`
  });
}

module.exports = {
  notifyUser,
  createInAppNotification,
  broadcastToActiveUsers,
  notifyMatchedDonors,
  sendWelcomeNotification,
  broadcastSOS,
  buildWelcomeMessage
};