const Campaign =
  require('../models/Campaign');

const CampaignRegistration =
  require('../models/CampaignRegistration');


const {
  checkEligibility
} =
  require('./eligibilityService');

const {
  resolveDonor,
  normalizeDonor
} =
  require('./donorIdentityService');


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
| Create campaign
|--------------------------------------------------------------------------
*/

async function createCampaign(
  payload
) {
  const errors = [];

  if (!payload.organizer) {
    errors.push(
      'organizer is required.'
    );
  }

  if (!payload.title) {
    errors.push(
      'title is required.'
    );
  }

  if (!payload.venue) {
    errors.push(
      'venue is required.'
    );
  }

  if (!payload.startDate) {
    errors.push(
      'startDate is required.'
    );
  }

  if (!payload.endDate) {
    errors.push(
      'endDate is required.'
    );
  }

  const coords =
    payload.location
      ?.coordinates;

  if (
    !coords ||
    !Array.isArray(
      coords
    ) ||
    coords.length !== 2
  ) {
    errors.push(
      'location.coordinates must be [longitude, latitude].'
    );
  }

  if (
    payload.startDate &&
    payload.endDate &&
    new Date(
      payload.endDate
    ) <
      new Date(
        payload.startDate
      )
  ) {
    errors.push(
      'endDate cannot be earlier than startDate.'
    );
  }

  if (
    errors.length
  ) {
    const err =
      badRequest(
        'Validation failed'
      );

    err.details =
      errors;

    throw err;
  }

  return Campaign.create({
    organizer:
      payload.organizer,

    title:
      payload.title,

    description:
      payload.description ||
      '',

    venue:
      payload.venue,

    location: {
      type:
        'Point',

      coordinates:
        coords.map(
          Number
        ),

      address:
        payload.location
          ?.address ||
        ''
    },

    startDate:
      payload.startDate,

    endDate:
      payload.endDate,

    targetUnits:
      Number(
        payload.targetUnits
      ) || 0,

    priorityBloodGroups:
      payload.priorityBloodGroups ||
      [],

    contactPhone:
      payload.contactPhone ||
      ''
  });
}

/*
|--------------------------------------------------------------------------
| Build campaign filter
|--------------------------------------------------------------------------
*/

function buildCampaignFilter(
  params = {}
) {
  const filter = {
    isActive:
      true
  };

  const now =
    new Date();

  if (
    params.organizer
  ) {
    filter.organizer =
      params.organizer;
  }

  if (
    params.status ===
    'upcoming'
  ) {
    filter.startDate = {
      $gt:
        now
    };
  }

  if (
    params.status ===
    'ongoing'
  ) {
    filter.startDate = {
      $lte:
        now
    };

    filter.endDate = {
      $gte:
        now
    };
  }

  if (
    params.status ===
    'completed'
  ) {
    filter.endDate = {
      $lt:
        now
    };
  }

  if (
    params.bloodGroup
  ) {
    filter.priorityBloodGroups =
      params.bloodGroup;
  }

  if (
    params.lat &&
    params.lng
  ) {
    const radiusKm =
      Number(
        params.radius
      ) || 10;

    filter.location = {
      $geoWithin: {
        $centerSphere: [
          [
            Number(
              params.lng
            ),

            Number(
              params.lat
            )
          ],

          radiusKm /
            6378.1
        ]
      }
    };
  }

  return filter;
}

/*
|--------------------------------------------------------------------------
| List campaigns
|--------------------------------------------------------------------------
*/

async function listCampaigns(
  params = {}
) {
  const filter =
    buildCampaignFilter(
      params
    );

  const campaigns =
    await Campaign
      .find(filter)

      .populate(
        'organizer',
        'name email phone role'
      )

      .sort({
        startDate:
          1
      });

  return {
    results:
      campaigns,

    total:
      campaigns.length,

    appliedFilters:
      filter
  };
}

/*
| Register donor
|
| Native Donor
| Patient + donorProfile
|-
*/

async function registerDonor(
  campaignId,
  donorIdentifier
) {
  const campaign =
    await Campaign.findById(
      campaignId
    );

  if (!campaign) {
    throw notFound(
      'Campaign not found.'
    );
  }

  if (
    !campaign.isActive
  ) {
    throw badRequest(
      'This campaign has been cancelled.'
    );
  }

  if (
    campaign.status ===
    'completed'
  ) {
    throw badRequest(
      'This campaign has already ended.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Universal donor resolver
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
  | Explicit duplicate check
  |--------------------------------------------------------------------------
  */

  const existing =
    await CampaignRegistration
      .findOne({
        campaign:
          campaign._id,

        donor:
          donor._id
      });

  if (existing) {
    throw badRequest(
      'You are already registered for this campaign.'
    );
  }

  const registration =
    await CampaignRegistration.create({
      campaign:
        campaign._id,

      donor:
        donor._id
    });

  campaign.registeredCount +=
    1;

  await campaign.save();

  const eligibility =
    checkEligibility(
      donorData
    );

  return {
    registration,

    donorId:
      donor._id,

    donorPublicId:
      donorData.publicId,

    donorName:
      donorData.name,

    bloodGroup:
      donorData.bloodGroup,

    donorType:
      donorData.donorType,

    currentlyEligible:
      eligibility.eligible,

    eligibilityNotes:
      eligibility.reasons,

    nextEligibleDate:
      eligibility.nextEligibleDate
  };
}

/*
| Campaign registrations

|
| We populate User and normalize donor data afterward.

*/

async function getCampaignRegistrations(
  campaignId
) {
  const registrations =
    await CampaignRegistration
      .find({
        campaign:
          campaignId
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
          'isAvailable',
          'totalDonations',
          'donorProfile',
          'location',
          'isActive'
        ].join(' ')
      )

      .populate(
        'donationRecord',
        'publicId donationDate unitsDonated'
      )

      .sort({
        registeredAt:
          -1
      });

  return registrations.map(
    (
      registration
    ) => {
      const object =
        registration.toObject();

      if (
        registration.donor
      ) {
        object.donor =
          normalizeDonor(
            registration.donor
          );
      }

      return object;
    }
  );
}

/*
|--------------------------------------------------------------------------
| Record attendance / donation
|--------------------------------------------------------------------------
|
*/
async function recordAttendance(
  registrationId,
  {
    attended,
    notes
  }
) {
  const registration =
    await CampaignRegistration
      .findById(
        registrationId
      );

  if (!registration) {
    throw notFound(
      'Registration not found.'
    );
  }

  if (
    attended !==
    undefined
  ) {
    registration.attended =
      Boolean(
        attended
      );
  }

  if (
    notes !==
    undefined
  ) {
    registration.notes =
      String(
        notes ||
        ''
      );
  }

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | Campaign staff can ONLY record attendance here.
  |
  | They can no longer directly modify:
  |
  | donated
  | unitsDonated
  | donationRecord
  | campaign.unitsCollected
  |
  | A donor must submit the campaign donation from the Donations page.
  | Admin approval then updates these values.
  |--------------------------------------------------------------------------
  */

  await registration.save();

  return CampaignRegistration
    .findById(
      registration._id
    )
    .populate(
      'donationRecord',
      'publicId donationDate unitsDonated status'
    );
}

/*
| Organizer ownership
|
*/

async function assertCampaignManager(
  campaignId,
  user
) {
  const campaign =
    await Campaign.findById(
      campaignId
    );

  if (!campaign) {
    throw notFound(
      'Campaign not found.'
    );
  }

  if (
    user?.role ===
    'Admin'
  ) {
    return campaign;
  }

  if (
    String(
      campaign.organizer
    ) !==
    String(
      user?._id
    )
  ) {
    throw forbidden(
      'You may only manage campaigns created by your own institution.'
    );
  }

  return campaign;
}

module.exports = {
  createCampaign,
  listCampaigns,
  registerDonor,
  getCampaignRegistrations,
  recordAttendance,
  assertCampaignManager,
  buildCampaignFilter
};