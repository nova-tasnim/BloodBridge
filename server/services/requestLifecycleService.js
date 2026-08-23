const {
  BloodRequest
} = require('../models/BloodRequest');

const {
  DonorResponse
} = require('../models/DonorResponse');

const {
  recordDonation
} = require('./donationService');

const {
  resolveDonor,
  normalizeDonor
} = require('./donorIdentityService');

const {
  createNotification
} = require('../controllers/notificationController');

/*
|--------------------------------------------------------------------------
| Request state machine
|--------------------------------------------------------------------------
*/

const TRANSITIONS = {
  pending: [
    'matched',
    'cancelled',
    'expired'
  ],

  matched: [
    'accepted',
    'pending',
    'cancelled',
    'expired'
  ],

  accepted: [
    'matched',
    'cancelled'
  ],

  fulfilled: [],

  cancelled: [],

  expired: [
    'pending'
  ]
};

const TERMINAL_STATES = [
  'fulfilled',
  'cancelled'
];

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
*/

function badRequest(message) {
  const err =
    new Error(message);

  err.statusCode = 400;

  return err;
}

function forbidden(message) {
  const err =
    new Error(message);

  err.statusCode = 403;

  return err;
}

function notFound(message) {
  const err =
    new Error(message);

  err.statusCode = 404;

  return err;
}

/*
|--------------------------------------------------------------------------
| State helpers
|--------------------------------------------------------------------------
*/

function canTransition(
  from,
  to
) {
  const allowed =
    TRANSITIONS[from];

  if (!allowed) {
    return false;
  }

  return allowed.includes(
    to
  );
}

function getAllowedTransitions(
  from
) {
  return TRANSITIONS[from]
    ? [
        ...TRANSITIONS[from]
      ]
    : [];
}

/*
|--------------------------------------------------------------------------
| Change lifecycle state
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| "fulfilled" is intentionally NOT reachable through this generic
| state transition function.
|
| Fulfillment must go through fulfilRequest() so a verified donation
| record is created at the same time.
|--------------------------------------------------------------------------
*/

async function transitionStatus(
  requestId,
  nextStatus,
  options = {}
) {
  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    throw notFound(
      'Blood request not found.'
    );
  }

  const current =
    request.status;

  if (
    nextStatus ===
    'fulfilled'
  ) {
    throw badRequest(
      'Use the fulfillment verification action to mark a request fulfilled.'
    );
  }

  if (
    current ===
    nextStatus
  ) {
    throw badRequest(
      `Request is already "${current}".`
    );
  }

  if (
    TERMINAL_STATES.includes(
      current
    )
  ) {
    throw badRequest(
      `"${current}" is a terminal state; the request can no longer be changed.`
    );
  }

  if (
    !canTransition(
      current,
      nextStatus
    )
  ) {
    throw badRequest(
      `Cannot move from "${current}" to "${nextStatus}". ` +
      `Allowed from "${current}": ${
        getAllowedTransitions(
          current
        ).join(', ') ||
        'none'
      }.`
    );
  }

  request.status =
    nextStatus;

  if (
    nextStatus ===
    'cancelled'
  ) {
    request.isActive =
      false;
  }

  await request.save();

  return {
    requestId:
      request._id,

    publicId:
      request.publicId,

    patientName:
      request.patientName,

    previousStatus:
      current,

    currentStatus:
      request.status,

    allowedNext:
      getAllowedTransitions(
        request.status
      )
  };
}

/*
|--------------------------------------------------------------------------
| Invite matched donors
|--------------------------------------------------------------------------
*/

async function inviteMatchedDonors(
  requestId,
  matches = []
) {
  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    throw notFound(
      'Blood request not found.'
    );
  }

  const created = [];

  for (
    const match
    of matches
  ) {
    try {
      const donor =
        await resolveDonor(
          match.donorId
        );

      if (!donor) {
        continue;
      }

      /*
       * Only donors actually attached to this request may be invited.
       */
      const isMatched =
        request.matchedDonors.some(
          (id) =>
            String(id) ===
            String(donor._id)
        );

      if (!isMatched) {
        continue;
      }

      const response =
        await DonorResponse.create({
          bloodRequest:
            requestId,

          donor:
            donor._id,

          matchScore:
            match.score ||
            0
        });

      created.push(
        response
      );
    } catch (err) {
      /*
       * Duplicate invitation = safely ignore.
       */
      if (
        err.code !==
        11000
      ) {
        throw err;
      }
    }
  }

  return created;
}

/*
|--------------------------------------------------------------------------
| Donor responds
|--------------------------------------------------------------------------
|
| Only a donor already matched to the request may respond.
|--------------------------------------------------------------------------
*/

async function respondToRequest(
  requestId,
  donorIdentifier,
  decision,
  extra = {}
) {
  if (
    ![
      'accepted',
      'declined'
    ].includes(
      decision
    )
  ) {
    throw badRequest(
      'decision must be either "accepted" or "declined".'
    );
  }

  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    throw notFound(
      'Blood request not found.'
    );
  }

  if (
    TERMINAL_STATES.includes(
      request.status
    )
  ) {
    throw badRequest(
      `This request is ${request.status} and no longer accepts responses.`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UNIVERSAL donor resolution
  |--------------------------------------------------------------------------
  */

  const donor =
    await resolveDonor(
      donorIdentifier
    );

  if (!donor) {
    throw notFound(
      'Donor not found.'
    );
  }

  const donorData =
    normalizeDonor(
      donor
    );

  /*
  |--------------------------------------------------------------------------
  | Must actually be matched
  |--------------------------------------------------------------------------
  */

  const isMatched =
    request.matchedDonors.some(
      (id) =>
        String(id) ===
        String(donor._id)
    );

  let response =
    await DonorResponse.findOne({
      bloodRequest:
        requestId,

      donor:
        donor._id
    });

  /*
   * Capability matrix says:
   *
   * "Respond to a matched request"
   *
   * Therefore an arbitrary donor cannot respond to every public request.
   */
  if (
    !isMatched &&
    !response
  ) {
    throw forbidden(
      'You cannot respond because you were not matched to this blood request.'
    );
  }

  /*
   * Matching may have persisted matchedDonors but an invitation response
   * object may not yet exist. Create one safely here.
   */
  if (!response) {
    response =
      new DonorResponse({
        bloodRequest:
          requestId,

        donor:
          donor._id
      });
  }

  if (
    [
      'accepted',
      'declined',
      'completed'
    ].includes(
      response.status
    )
  ) {
    throw badRequest(
      `You have already ${response.status} this request.`
    );
  }

  response.status =
    decision;

  response.respondedAt =
    new Date();

  if (
    decision ===
    'declined'
  ) {
    response.declineReason =
      extra.reason ||
      '';
  }

  /*
  |--------------------------------------------------------------------------
  | Approximate-location consent
  |--------------------------------------------------------------------------
  */

  if (
    extra.shareLocation
  ) {
    response.shareLocation =
      true;

    if (
      Array.isArray(
        extra.donorCoordinates
      ) &&
      extra.donorCoordinates
        .length === 2
    ) {
      response.donorCoordinates =
        extra.donorCoordinates;
    }

    if (
      extra.donorArea
    ) {
      response.donorArea =
        extra.donorArea;
    }
  } else {
    response.shareLocation =
      false;

    response.donorCoordinates =
      undefined;

    response.donorArea =
      '';
  }

  await response.save();

  let statusChange =
    null;

  /*
   * First acceptance moves request to accepted.
   */
  if (
    decision ===
      'accepted' &&
    [
      'pending',
      'matched'
    ].includes(
      request.status
    )
  ) {
    statusChange =
      await transitionStatus(
        requestId,
        'accepted'
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Notify requester
  |--------------------------------------------------------------------------
  */

  await createNotification(
    request.requester,

    `Donor ${donor.name} ${decision} your blood request for ${request.patientName} (${request.publicId || request._id}).`,

    'status_update'
  );

  return {
    requestId:
      request._id,

    publicId:
      request.publicId,

    donorId:
      donor._id,

    donorPublicId:
      donorData.publicId,

    donorName:
      donor.name,

    bloodGroup:
      donorData.bloodGroup,

    decision,

    respondedAt:
      response.respondedAt,

    shareLocation:
      response.shareLocation,

    donorArea:
      response.donorArea,

    requestStatus:
      statusChange
        ? statusChange.currentStatus
        : request.status,

    statusChanged:
      Boolean(
        statusChange
      )
  };
}

/*
|--------------------------------------------------------------------------
| Verify/fulfil request
|--------------------------------------------------------------------------
|
| Route authorization ensures:
|
| Hospital
| BloodBank
| Admin
|
| only.
|--------------------------------------------------------------------------
*/

async function fulfilRequest(
  requestId,
  donorIdentifier,
  options = {}
) {
  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    throw notFound(
      'Blood request not found.'
    );
  }

  if (
    TERMINAL_STATES.includes(
      request.status
    )
  ) {
    throw badRequest(
      `Request is already ${request.status}.`
    );
  }

  if (
    ![
      'accepted',
      'matched'
    ].includes(
      request.status
    )
  ) {
    throw badRequest(
      `A donation can only be verified once a donor has been matched or accepted. Current status: "${request.status}".`
    );
  }

  /*
   * donorIdentifier may be:
   *
   * ObjectId
   * DON-XXXXXX native donor
   * DON-XXXXXX Patient donor
   */
  const donor =
    await resolveDonor(
      donorIdentifier
    );

  if (!donor) {
    throw notFound(
      'Donor not found.'
    );
  }

  /*
   * Fulfillment must correspond to a matched donor.
   */
  const isMatched =
    request.matchedDonors.some(
      (id) =>
        String(id) ===
        String(donor._id)
    );

  const response =
    await DonorResponse.findOne({
      bloodRequest:
        requestId,

      donor:
        donor._id
    });

  const accepted =
    response &&
    [
      'accepted',
      'completed'
    ].includes(
      response.status
    );

  if (
    !isMatched &&
    !accepted
  ) {
    throw forbidden(
      'This donor was not matched to this request.'
    );
  }

  const units =
    Number(
      options.unitsDonated
    ) || 1;

  if (
    !Number.isFinite(
      units
    ) ||
    units <= 0
  ) {
    throw badRequest(
      'unitsDonated must be greater than 0.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Donation record
  |--------------------------------------------------------------------------
  */

  const donation =
    await recordDonation({
      donorId:
        donor._id,

      bloodRequestId:
        requestId,

      bloodBankId:
        options.bloodBankId ||
        null,

      unitsDonated:
        units,

      locationName:
        options.locationName ||
        request.hospitalName ||
        '',

      notes:
        options.notes ||
        `Donation against request for ${request.patientName}`,

      verifiedBy:
        options.verifiedBy ||
        null
    });

  request.unitsFulfilled +=
    units;

  if (response) {
    response.status =
      'completed';

    await response.save();
  }

  const fullyMet =
    request.unitsFulfilled >=
    request.unitsNeeded;

  if (fullyMet) {
    request.status =
      'fulfilled';
  }

  await request.save();

  /*
  |--------------------------------------------------------------------------
  | Notifications
  |--------------------------------------------------------------------------
  */

  await createNotification(
    donor._id,

    `Your donation of ${units} unit(s) for ${request.patientName} has been verified. Thank you for donating.`,

    'status_update'
  );

  await createNotification(
    request.requester,

    fullyMet
      ? `Your blood request for ${request.patientName} has been fully fulfilled.`
      : `${units} unit(s) recorded for your request for ${request.patientName}. ${Math.max(
          request.unitsNeeded -
            request.unitsFulfilled,
          0
        )} unit(s) still needed.`,

    'status_update'
  );

  return {
    donationId:
      donation._id,

    donationPublicId:
      donation.publicId,

    donorId:
      donor._id,

    unitsDonated:
      units,

    unitsFulfilled:
      request.unitsFulfilled,

    unitsNeeded:
      request.unitsNeeded,

    unitsRemaining:
      Math.max(
        request.unitsNeeded -
          request.unitsFulfilled,
        0
      ),

    requestStatus:
      request.status,

    fullyFulfilled:
      fullyMet
  };
}

/*
|--------------------------------------------------------------------------
| Responses
|--------------------------------------------------------------------------
*/

async function getResponses(
  requestId
) {
  const responses =
    await DonorResponse
      .find({
        bloodRequest:
          requestId
      })

      .populate(
        'donor',
        [
          'name',
          'email',
          'phone',
          'role',
          'publicId',
          'bloodGroup',
          'dateOfBirth',
          'gender',
          'weightKg',
          'lastDonationDate',
          'totalDonations',
          'isAvailable',
          'location',
          'donorProfile'
        ].join(' ')
      )

      .sort({
        matchScore: -1
      });

  /*
   * Normalize response donor so frontend sees the same shape
   * for Nova and Kader.
   */
  return responses.map(
    (response) => {
      const object =
        response.toObject();

      if (
        response.donor
      ) {
        const normalized =
          normalizeDonor(
            response.donor
          );

        if (normalized) {
          object.donor =
            normalized;
        }
      }

      return object;
    }
  );
}

/*
|--------------------------------------------------------------------------
| Timeline
|--------------------------------------------------------------------------
*/

async function getRequestTimeline(
  requestId
) {
  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    throw notFound(
      'Blood request not found.'
    );
  }

  const responses =
    await getResponses(
      requestId
    );

  return {
    requestId:
      request._id,

    publicId:
      request.publicId,

    requester:
      request.requester,

    patientName:
      request.patientName,

    currentStatus:
      request.status,

    allowedNext:
      getAllowedTransitions(
        request.status
      ),

    isTerminal:
      TERMINAL_STATES.includes(
        request.status
      ),

    unitsNeeded:
      request.unitsNeeded,

    unitsFulfilled:
      request.unitsFulfilled,

    unitsRemaining:
      request.unitsRemaining,

    hoursWaiting:
      request.hoursWaiting,

    createdAt:
      request.createdAt,

    matchedDonors:
      request.matchedDonors,

    responseSummary: {
      total:
        responses.length,

      pending:
        responses.filter(
          (r) =>
            r.status ===
            'pending'
        ).length,

      accepted:
        responses.filter(
          (r) =>
            r.status ===
            'accepted'
        ).length,

      declined:
        responses.filter(
          (r) =>
            r.status ===
            'declined'
        ).length,

      completed:
        responses.filter(
          (r) =>
            r.status ===
            'completed'
        ).length
    },

    responses
  };
}

module.exports = {
  transitionStatus,
  respondToRequest,
  fulfilRequest,
  inviteMatchedDonors,
  getResponses,
  getRequestTimeline,
  canTransition,
  getAllowedTransitions,
  TRANSITIONS,
  TERMINAL_STATES
};