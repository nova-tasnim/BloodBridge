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

  const donor =
    await resolveDonor(
      donorIdentifier
    );

  if (!donor) {
    throw notFound(
      'Donor not found.'
    );
  }

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
    units < 0.5
  ) {
    throw badRequest(
      'unitsDonated must be at least 0.5.'
    );
  }


  const donation =
    await recordDonation({
      donorId:
        donor._id,

      donationType:
        'request',

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
        `Donation submitted against request for ${request.patientName}`,

      submittedBy:
        options.verifiedBy
    });

  /*
   * Keep response as accepted.
   *
   * It becomes completed only when Admin approves.
   */
  if (
    response &&
    response.status ===
      'completed'
  ) {
    response.status =
      'accepted';

    await response.save();
  }

  try {
    await createNotification(
      donor._id,

      `Donation ${donation.publicId} for ${request.patientName} was submitted and is waiting for Admin approval.`,

      'status_update'
    );

    await createNotification(
      request.requester,

      `A donation for your request ${request.publicId || request._id} was submitted and is waiting for Admin approval.`,

      'status_update'
    );
  } catch (err) {
    console.error(
      'Pending fulfillment notification failed:',
      err.message
    );
  }

  return {
    donationId:
      donation._id,

    donationPublicId:
      donation.publicId,

    donorId:
      donor._id,

    unitsDonated:
      units,

    donationStatus:
      donation.status,

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
      false,

    awaitingAdminApproval:
      true
  };
}

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
  requestId,
  {
    viewerId = null,
    visibility = 'owner'
  } = {}
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

  const allResponses =
    await getResponses(
      requestId
    );

  /*
  |--------------------------------------------------------------------------
  | Privacy-aware response visibility
  |--------------------------------------------------------------------------
  |
  | staff:
  |   full response details
  |
  | owner:
  |   response progress only — no donor identity/contact/location
  |
  | donor:
  |   only that donor's own response
  |
  */

  let responses = [];

  if (
    visibility ===
    'staff'
  ) {
    responses =
      allResponses;
  }

  else if (
    visibility ===
    'donor'
  ) {
    responses =
      allResponses
        .filter(
          (response) => {
            const donorId =
              response
                ?.donor
                ?._id ||
              response
                ?.donor;

            return (
              String(
                donorId
              ) ===
              String(
                viewerId
              )
            );
          }
        );
  }

  else {
    /*
     * Request owner can understand progress,
     * but should not receive another donor's
     * personal information.
     */
    responses =
      allResponses.map(
        (response) => ({
          _id:
            response._id,

          status:
            response.status,

          respondedAt:
            response.respondedAt,

          createdAt:
            response.createdAt,

          updatedAt:
            response.updatedAt
        })
      );
  }

  /*
   * Full aggregate counts are useful to the requester
   * and operational staff without exposing donor identity.
   */
  const responseSummary = {
    total:
      allResponses.length,

    pending:
      allResponses.filter(
        (r) =>
          r.status ===
          'pending'
      ).length,

    accepted:
      allResponses.filter(
        (r) =>
          r.status ===
          'accepted'
      ).length,

    declined:
      allResponses.filter(
        (r) =>
          r.status ===
          'declined'
      ).length,

    completed:
      allResponses.filter(
        (r) =>
          r.status ===
          'completed'
      ).length
  };

  return {
    requestId:
      request._id,

    publicId:
      request.publicId,

    /*
     * Requester identity is operationally useful
     * to owner/staff, but not necessary for a matched donor.
     */
    requester:
      visibility ===
      'donor'
        ? null
        : request.requester,

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

    /*
     * Never reveal the complete matched-donor list
     * to ordinary request owners or donors.
     */
    matchedDonors:
      visibility ===
      'staff'
        ? request.matchedDonors
        : [],

    matchedDonorCount:
      request
        .matchedDonors
        .length,

    responseSummary,

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