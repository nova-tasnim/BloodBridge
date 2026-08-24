const Reminder =
  require('../models/Reminder');

const {
  resolveDonor,
  normalizeDonor
} =
  require('../services/donorIdentityService');

const {
  checkEligibility
} =
  require('../services/eligibilityService');

const {
  notifyUser
} =
  require('../services/notificationService');


/*
|--------------------------------------------------------------------------
| Resolve native Donor OR Patient-donor
|--------------------------------------------------------------------------
*/

async function getResolvedDonor(
  identifier
) {
  const user =
    await resolveDonor(
      identifier
    );

  if (!user) {
    return null;
  }

  const donor =
    normalizeDonor(user);

  if (!donor) {
    return null;
  }

  return {
    user,
    donor
  };
}


/*
|--------------------------------------------------------------------------
| GET /api/reminders/donor/:donorId/next-eligible
|--------------------------------------------------------------------------
*/

exports.getNextEligibleDate =
  async (req, res) => {
    try {
      const resolved =
        await getResolvedDonor(
          req.params.donorId
        );

      if (!resolved) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Donor not found'
          });
      }

      /*
       * IMPORTANT:
       * eligibilityService is the single
       * source of truth.
       */
      const eligibility =
        checkEligibility(
          resolved.donor
        );

      return res.json({
        success: true,

        donor: {
          _id:
            resolved.user._id,

          publicId:
            resolved.donor
              .publicId,

          name:
            resolved.donor
              .name,

          donorType:
            resolved.donor
              .donorType
        },

        nextEligibleDate:
          eligibility
            .nextEligibleDate,

        isEligibleNow:
          eligibility
            .eligible,

        reasons:
          eligibility
            .reasons,

        requiredIntervalDays:
          eligibility
            .requiredIntervalDays,

        daysSinceLastDonation:
          eligibility
            .daysSinceLastDonation
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };


/*
|--------------------------------------------------------------------------
| POST /api/reminders/donor/:donorId
|--------------------------------------------------------------------------
|
| Creates or refreshes the reminder stored
| in MongoDB.
|
*/

exports.createReminder =
  async (req, res) => {
    try {
      const resolved =
        await getResolvedDonor(
          req.params.donorId
        );

      if (!resolved) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Donor not found'
          });
      }

      const eligibility =
        checkEligibility(
          resolved.donor
        );

      /*
       * If there is no future date,
       * there is nothing to remind about.
       */
      if (
        !eligibility
          .nextEligibleDate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'This donor does not currently have a future donation eligibility date.',

            eligibility
          });
      }

      const reminder =
        await Reminder
          .findOneAndUpdate(
            {
              donorId:
                resolved.user._id
            },

            {
              donorId:
                resolved.user._id,

              nextEligibleDate:
                eligibility
                  .nextEligibleDate,

              reminderSent:
                false,

              reminderDate:
                null
            },

            {
              upsert: true,
              new: true,
              runValidators:
                true
            }
          );

      return res
        .status(201)
        .json({
          success: true,
          reminder,
          eligibility
        });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };


/*
|--------------------------------------------------------------------------
| GET /api/reminders/donor/:donorId
|--------------------------------------------------------------------------
|
| Reads the ACTUAL saved Reminder document
| from MongoDB.
|
*/

exports.getReminderForDonor =
  async (req, res) => {
    try {
      const resolved =
        await getResolvedDonor(
          req.params.donorId
        );

      if (!resolved) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Donor not found'
          });
      }

      const reminder =
        await Reminder
          .findOne({
            donorId:
              resolved.user._id
          });

      return res.json({
        success: true,

        donor: {
          _id:
            resolved.user._id,

          publicId:
            resolved.donor
              .publicId,

          name:
            resolved.donor
              .name,

          donorType:
            resolved.donor
              .donorType
        },

        reminder:
          reminder || null
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };


/*
|--------------------------------------------------------------------------
| GET /api/reminders/due
|--------------------------------------------------------------------------
|
| Hospital / BloodBank / Admin
|
| Returns unsent reminders due within
| the next seven days.
|
*/

exports.getDueReminders =
  async (req, res) => {
    try {
      const now =
        new Date();

      const sevenDaysFromNow =
        new Date();

      sevenDaysFromNow
        .setDate(
          sevenDaysFromNow
            .getDate() + 7
        );

      const reminders =
        await Reminder
          .find({
            nextEligibleDate: {
              $lte:
                sevenDaysFromNow
            },

            reminderSent:
              false
          })
          .populate(
            'donorId'
          )
          .sort({
            nextEligibleDate:
              1
          });

      const dueReminders =
        [];

      for (
        const reminder
        of reminders
      ) {
        const user =
          reminder.donorId;

        if (!user) {
          continue;
        }

        const donor =
          normalizeDonor(
            user
          );

        /*
         * Deleted / inactive /
         * non-donor-capable account.
         */
        if (!donor) {
          continue;
        }

        /*
         * Re-check current eligibility.
         * Do not trust an old calculation.
         */
        const eligibility =
          checkEligibility(
            donor
          );

        if (
          !eligibility
            .nextEligibleDate
        ) {
          continue;
        }

        const currentNextDate =
          new Date(
            eligibility
              .nextEligibleDate
          );

        /*
         * If eligibility has changed and
         * moved outside the 7-day window,
         * don't show it as due.
         */
        if (
          currentNextDate >
          sevenDaysFromNow
        ) {
          continue;
        }

        dueReminders.push({
          _id:
            reminder._id,

          donor: {
            _id:
              user._id,

            publicId:
              donor.publicId,

            name:
              donor.name,

            email:
              donor.email,

            phone:
              donor.phone,

            bloodGroup:
              donor.bloodGroup,

            donorType:
              donor.donorType
          },

          nextEligibleDate:
            eligibility
              .nextEligibleDate,

          reminderSent:
            reminder
              .reminderSent,

          reminderDate:
            reminder
              .reminderDate,

          overdue:
            currentNextDate <
            now,

          eligibility: {
            eligible:
              eligibility
                .eligible,

            reasons:
              eligibility
                .reasons,

            requiredIntervalDays:
              eligibility
                .requiredIntervalDays,

            daysSinceLastDonation:
              eligibility
                .daysSinceLastDonation
          }
        });
      }

      return res.json({
        success: true,

        count:
          dueReminders.length,

        reminders:
          dueReminders
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };


/*
|--------------------------------------------------------------------------
| PATCH /api/reminders/:reminderId/sent
|--------------------------------------------------------------------------
|
| Staff clicks "Send Reminder".
|
| This:
|
| 1. Creates in-app Notification
| 2. Attempts email through existing
|    notification/email service
| 3. Marks Reminder as sent
|
*/

exports.markReminderSent =
  async (req, res) => {
    try {
      const reminder =
        await Reminder
          .findById(
            req.params
              .reminderId
          );

      if (!reminder) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Reminder not found'
          });
      }

      if (
        reminder
          .reminderSent
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'This reminder has already been sent'
          });
      }

      const dateLabel =
        new Date(
          reminder
            .nextEligibleDate
        )
          .toLocaleDateString(
            'en-GB',
            {
              day:
                'numeric',

              month:
                'long',

              year:
                'numeric'
            }
          );

      /*
       * notificationService:
       *
       * creates in-app Notification
       * +
       * attempts email
       */
      const delivery =
        await notifyUser({
          userId:
            reminder.donorId,

          message:
            `BloodBridge reminder: your next eligible blood donation date is ${dateLabel}. ` +
            `Please review your current eligibility in BloodBridge before donating.`,

          type:
            'reminder',

          subject:
            'BloodBridge — Donation Eligibility Reminder',

          eventKey:
            `reminder:${reminder._id}:${new Date(
              reminder
                .nextEligibleDate
            ).toISOString()}`
        });

      reminder.reminderSent =
        true;

      reminder.reminderDate =
        new Date();

      await reminder.save();

      return res.json({
        success: true,

        message:
          'Reminder sent successfully',

        reminder,

        delivery: {
          inAppCreated:
            Boolean(
              delivery
                ?.notification
            ),

          emailSent:
            Boolean(
              delivery
                ?.emailSent
            )
        }
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };