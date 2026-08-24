const DonationRecord =
  require('../models/DonationRecord');

const Campaign =
  require('../models/Campaign');

const CampaignRegistration =
  require('../models/CampaignRegistration');

const {
  BloodRequest
} =
  require('../models/BloodRequest');

const {
  DonorResponse
} =
  require('../models/DonorResponse');

const {
  resolveDonor,
  normalizeDonor,
  registerDonationAggregate
} =
  require('./donorIdentityService');

const {
  notifyUser
} =
  require('./notificationService');

/*
|--------------------------------------------------------------------------
| Error helpers
|--------------------------------------------------------------------------
*/

function badRequest(
  message
) {
  const err =
    new Error(
      message
    );

  err.statusCode =
    400;

  return err;
}

function forbidden(
  message
) {
  const err =
    new Error(
      message
    );

  err.statusCode =
    403;

  return err;
}

function notFound(
  message
) {
  const err =
    new Error(
      message
    );

  err.statusCode =
    404;

  return err;
}

/*
|--------------------------------------------------------------------------
| Submit donation
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This NO LONGER updates:
|
| totalDonations
| lastDonationDate
| campaign units
| request fulfillment
|
| Every donation starts:
|
| status = pending
|--------------------------------------------------------------------------
*/

async function recordDonation({
  donorId,

  donationType =
    'regular',

  campaignId =
    null,

  bloodRequestId =
    null,

  bloodBankId =
    null,

  donationDate =
    new Date(),

  unitsDonated =
    1,

  locationName =
    '',

  notes =
    '',

  submittedBy
}) {
  const donor =
    await resolveDonor(
      donorId
    );

  if (!donor) {
    throw notFound(
      'Donor not found'
    );
  }

  const donorData =
    normalizeDonor(
      donor
    );

  if (
    !submittedBy
  ) {
    throw badRequest(
      'submittedBy is required'
    );
  }

  const units =
    Number(
      unitsDonated
    );

  if (
    !Number.isFinite(
      units
    ) ||
    units < 0.5
  ) {
    throw badRequest(
      'Units donated must be at least 0.5'
    );
  }

  if (
    ![
      'regular',
      'campaign',
      'request'
    ].includes(
      donationType
    )
  ) {
    throw badRequest(
      'Invalid donation type'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Campaign donation validation
  |--------------------------------------------------------------------------
  */

  let campaign =
    null;

  if (
    donationType ===
    'campaign'
  ) {
    if (!campaignId) {
      throw badRequest(
        'Campaign is required for a campaign donation'
      );
    }

    campaign =
      await Campaign.findById(
        campaignId
      );

    if (!campaign) {
      throw notFound(
        'Campaign not found'
      );
    }

    if (
      !campaign.isActive
    ) {
      throw badRequest(
        'This campaign has been cancelled'
      );
    }

    const registration =
      await CampaignRegistration
        .findOne({
          campaign:
            campaign._id,

          donor:
            donor._id
        });

    if (!registration) {
      throw forbidden(
        'You must register for this campaign before submitting a campaign donation'
      );
    }

    /*
     * Do not allow duplicate pending/approved campaign donation.
     */
    const existingCampaignDonation =
      await DonationRecord
        .findOne({
          donor:
            donor._id,

          campaign:
            campaign._id,

          status: {
            $in: [
              'pending',
              'approved'
            ]
          }
        });

    if (
      existingCampaignDonation
    ) {
      throw badRequest(
        existingCampaignDonation.status ===
          'approved'
          ? 'Your donation for this campaign has already been approved'
          : 'You already have a campaign donation waiting for approval'
      );
    }

    const date =
      new Date(
        donationDate
      );

    const start =
      new Date(
        campaign.startDate
      );

    const end =
      new Date(
        campaign.endDate
      );

    /*
     * Give the final day its full 24 hours.
     */
    end.setHours(
      23,
      59,
      59,
      999
    );

    if (
      date < start ||
      date > end
    ) {
      throw badRequest(
        'Campaign donation date must fall within the campaign dates'
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Request donation idempotency
  |--------------------------------------------------------------------------
  */

  if (
    donationType ===
      'request' &&
    bloodRequestId
  ) {
    const existing =
      await DonationRecord
        .findOne({
          bloodRequest:
            bloodRequestId,

          donor:
            donor._id
        });

    if (existing) {
      return existing;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Create PENDING record only
  |--------------------------------------------------------------------------
  */

  const record =
    await DonationRecord
      .create({
        donor:
          donor._id,

        donationType,

        campaign:
          donationType ===
            'campaign'
            ? campaignId
            : null,

        bloodRequest:
          donationType ===
            'request'
            ? bloodRequestId
            : null,

        bloodBank:
          bloodBankId,

        bloodGroup:
          donorData.bloodGroup,

        donationDate:
          new Date(
            donationDate
          ),

        unitsDonated:
          units,

        locationName:
          locationName ||
          (
            campaign
              ? `${campaign.title} — ${campaign.venue}`
              : ''
          ),

        notes,

        submittedBy,

        status:
          'pending',

        verifiedBy:
          null,

        approvedBy:
          null,

        approvedAt:
          null
      });

  return record;
}

/*
|--------------------------------------------------------------------------
| Approve donation
|--------------------------------------------------------------------------
|
| ADMIN ONLY route calls this.
|--------------------------------------------------------------------------
*/

async function approveDonation(
  donationId,
  adminUser
) {
  if (
    !adminUser ||
    adminUser.role !==
      'Admin'
  ) {
    throw forbidden(
      'Only Admin can approve donations'
    );
  }

  const record =
    await DonationRecord
      .findById(
        donationId
      );

  if (!record) {
    throw notFound(
      'Donation record not found'
    );
  }

  if (
    record.status !==
    'pending'
  ) {
    throw badRequest(
      `Donation is already ${record.status}`
    );
  }

  const donor =
    await resolveDonor(
      record.donor
    );

  if (!donor) {
    throw notFound(
      'Donor not found'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 1. Update donor aggregate
  |--------------------------------------------------------------------------
  */

  await registerDonationAggregate(
    donor,
    record.donationDate
  );

  /*
  |--------------------------------------------------------------------------
  | 2. Campaign aggregate
  |--------------------------------------------------------------------------
  */

  if (
    record.donationType ===
      'campaign' &&
    record.campaign
  ) {
    const campaign =
      await Campaign.findById(
        record.campaign
      );

    if (!campaign) {
      throw notFound(
        'Linked campaign not found'
      );
    }

    const registration =
      await CampaignRegistration
        .findOne({
          campaign:
            campaign._id,

          donor:
            donor._id
        });

    if (!registration) {
      throw notFound(
        'Campaign registration not found'
      );
    }

    campaign.unitsCollected =
      (
        Number(
          campaign.unitsCollected
        ) || 0
      ) +
      Number(
        record.unitsDonated
      );

    await campaign.save();

    registration.attended =
      true;

    registration.donated =
      true;

    registration.unitsDonated =
      record.unitsDonated;

    registration.donationRecord =
      record._id;

    await registration.save();
  }

  /*
  |--------------------------------------------------------------------------
  | 3. Blood request fulfillment
  |--------------------------------------------------------------------------
  */

  let linkedRequest =
    null;

  if (
    record.donationType ===
      'request' &&
    record.bloodRequest
  ) {
    linkedRequest =
      await BloodRequest
        .findById(
          record.bloodRequest
        );

    if (!linkedRequest) {
      throw notFound(
        'Linked blood request not found'
      );
    }

    linkedRequest.unitsFulfilled =
      (
        Number(
          linkedRequest.unitsFulfilled
        ) || 0
      ) +
      Number(
        record.unitsDonated
      );

    if (
      linkedRequest.unitsFulfilled >=
      linkedRequest.unitsNeeded
    ) {
      linkedRequest.status =
        'fulfilled';

      linkedRequest.isActive =
        false;
    }

    await linkedRequest.save();

    /*
     * Mark donor response completed.
     */
    await DonorResponse
      .findOneAndUpdate(
        {
          bloodRequest:
            linkedRequest._id,

          donor:
            donor._id
        },

        {
          status:
            'completed'
        }
      );
  }

  /*
  |--------------------------------------------------------------------------
  | 4. Approve record LAST
  |--------------------------------------------------------------------------
  */

  record.status =
    'approved';

  record.approvedBy =
    adminUser._id;

  record.approvedAt =
    new Date();

  record.verifiedBy =
    adminUser._id;

  record.rejectionReason =
    '';

  await record.save();

  /*
  |--------------------------------------------------------------------------
  | 5. Notify donor
  |--------------------------------------------------------------------------
  */

  try {
    await notifyUser({
      userId:
        donor._id,

      type:
        'status_update',

      subject:
        'BloodBridge — Donation Approved',

      message:
        `Your donation ${record.publicId} has been approved. ` +
        `${record.unitsDonated} unit(s) have been added to your verified donation history.`,

      eventKey:
        `donation-approved:${record._id}`
    });
  } catch (err) {
    console.error(
      'Donation approval notification failed:',
      err.message
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 6. Requester notification
  |--------------------------------------------------------------------------
  */

  if (
    linkedRequest
  ) {
    try {
      await notifyUser({
        userId:
          linkedRequest.requester,

        type:
          'status_update',

        subject:
          'BloodBridge — Donation Verified',

        message:
          linkedRequest.status ===
            'fulfilled'
            ? `Your blood request ${linkedRequest.publicId || linkedRequest._id} has been fulfilled after Admin verification.`
            : `${record.unitsDonated} unit(s) were verified for your blood request ${linkedRequest.publicId || linkedRequest._id}.`,

        eventKey:
          `request-donation-approved:${record._id}`
      });
    } catch (err) {
      console.error(
        'Requester approval notification failed:',
        err.message
      );
    }
  }

  return DonationRecord
    .findById(
      record._id
    )
    .populate(
      'donor',
      'name email role publicId donorProfile'
    )
    .populate(
      'campaign',
      'title venue'
    )
    .populate(
      'bloodRequest',
      'publicId patientName status'
    )
    .populate(
      'approvedBy',
      'name role'
    );
}

/*
|--------------------------------------------------------------------------
| Reject donation
|--------------------------------------------------------------------------
*/

async function rejectDonation(
  donationId,
  adminUser,
  reason = ''
) {
  if (
    !adminUser ||
    adminUser.role !==
      'Admin'
  ) {
    throw forbidden(
      'Only Admin can reject donations'
    );
  }

  const record =
    await DonationRecord
      .findById(
        donationId
      );

  if (!record) {
    throw notFound(
      'Donation record not found'
    );
  }

  if (
    record.status !==
    'pending'
  ) {
    throw badRequest(
      `Donation is already ${record.status}`
    );
  }

  record.status =
    'rejected';

  record.rejectionReason =
    String(
      reason || ''
    ).trim();

  record.approvedBy =
    null;

  record.approvedAt =
    null;

  record.verifiedBy =
    null;

  await record.save();

  try {
    await notifyUser({
      userId:
        record.donor,

      type:
        'status_update',

      subject:
        'BloodBridge — Donation Submission Rejected',

      message:
        `Your donation ${record.publicId} was not approved.` +
        (
          record.rejectionReason
            ? ` Reason: ${record.rejectionReason}`
            : ''
        ),

      eventKey:
        `donation-rejected:${record._id}`
    });
  } catch (err) {
    console.error(
      'Donation rejection notification failed:',
      err.message
    );
  }

  return record;
}

/*
|--------------------------------------------------------------------------
| Pending approval list
|--------------------------------------------------------------------------
*/

async function getPendingDonations() {
  return DonationRecord
    .find({
      status:
        'pending'
    })

    .populate(
      'donor',
      'name email phone role publicId bloodGroup donorProfile'
    )

    .populate(
      'submittedBy',
      'name email role'
    )

    .populate(
      'campaign',
      'title venue startDate endDate'
    )

    .populate(
      'bloodRequest',
      'publicId patientName hospitalName'
    )

    .sort({
      createdAt:
        1
    });
}

/*
|--------------------------------------------------------------------------
| Donation history
|--------------------------------------------------------------------------
|
| includeAll:
|
| true  -> own history
| false -> public/other-donor history only approved records
|--------------------------------------------------------------------------
*/

async function getDonationHistory(
  donorId,
  {
    includeAll =
      false
  } = {}
) {
  const query = {
    donor:
      donorId
  };

  if (
    !includeAll
  ) {
    query.status =
      'approved';
  }

  return DonationRecord
    .find(query)

  .populate(
    'campaign',
    'title venue startDate endDate isActive targetUnits unitsCollected'
  )

    .populate(
      'bloodRequest',
      'publicId patientName hospitalName'
    )

    .populate(
      'bloodBank',
      'name location'
    )

    .populate(
      'submittedBy',
      'name role'
    )

    .populate(
      'verifiedBy',
      'name role'
    )

    .populate(
      'approvedBy',
      'name role'
    )

    .sort({
      donationDate:
        -1
    });
}

/*
|--------------------------------------------------------------------------
| Verified statistics only
|--------------------------------------------------------------------------
*/

async function getDonationStats(
  donorId
) {
  const records =
    await DonationRecord
      .find({
        donor:
          donorId,

        status:
          'approved'
      });

  const totalUnits =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        (
          Number(
            record.unitsDonated
          ) || 0
        ),
      0
    );

  const lastDonation =
    records.length
      ? records.reduce(
          (
            latest,
            record
          ) =>
            new Date(
              record.donationDate
            ) >
            new Date(
              latest.donationDate
            )
              ? record
              : latest
        ).donationDate
      : null;

  return {
    totalDonations:
      records.length,

    totalUnits,

    lastDonation
  };
}

/*
|--------------------------------------------------------------------------
| Registered campaigns for logged-in donor
|--------------------------------------------------------------------------
*/

async function getRegisteredCampaignsForDonor(
  donorId
) {
  const registrations =
    await CampaignRegistration
      .find({
        donor:
          donorId
      })

      .populate(
        'campaign',
        'title venue startDate endDate isActive location targetUnits unitsCollected'
      )

      .sort({
        registeredAt:
          -1
      });

  const result = [];

  for (
    const registration
    of registrations
  ) {
    const campaign =
      registration.campaign;

    if (
      !campaign ||
      !campaign.isActive
    ) {
      continue;
    }

    const existing =
      await DonationRecord
        .findOne({
          donor:
            donorId,

          campaign:
            campaign._id,

          status: {
            $in: [
              'pending',
              'approved'
            ]
          }
        })
        .select(
          'publicId status'
        );

    result.push({
      registrationId:
        registration._id,

      campaign,

      attended:
        registration.attended,

      donated:
        registration.donated,

      donationRecord:
        registration.donationRecord,

      existingSubmission:
        existing,

      /*
       * A registered campaign remains selectable as long as there is no
       * pending/approved submission for it.
       *
       * The actual donation date is validated when recordDonation() runs.
       */
      canSubmit:
        !existing
    });
  }

  return result;
}

module.exports = {
  recordDonation,
  approveDonation,
  rejectDonation,
  getPendingDonations,
  getDonationHistory,
  getDonationStats,
  getRegisteredCampaignsForDonor,
  resolveDonor
};