const Campaign = require('../models/Campaign');
const CampaignRegistration = require('../models/CampaignRegistration');
const Donor = require('../models/Donor');
const { checkEligibility } = require('./eligibilityService');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

async function createCampaign(payload) {
  const errors = [];

  if (!payload.organizer) errors.push('organizer is required.');
  if (!payload.title) errors.push('title is required.');
  if (!payload.venue) errors.push('venue is required.');
  if (!payload.startDate) errors.push('startDate is required.');
  if (!payload.endDate) errors.push('endDate is required.');

  const coords = payload.location && payload.location.coordinates;
  if (!coords || !Array.isArray(coords) || coords.length !== 2) {
    errors.push('location.coordinates must be [longitude, latitude].');
  }

  if (payload.startDate && payload.endDate) {
    if (new Date(payload.endDate) < new Date(payload.startDate)) {
      errors.push('endDate cannot be earlier than startDate.');
    }
  }

  if (errors.length) {
    const err = badRequest('Validation failed');
    err.details = errors;
    throw err;
  }

  return Campaign.create({
    organizer: payload.organizer,
    title: payload.title,
    description: payload.description || '',
    venue: payload.venue,
    location: {
      type: 'Point',
      coordinates: coords.map(Number),
      address: payload.location.address || ''
    },
    startDate: payload.startDate,
    endDate: payload.endDate,
    targetUnits: payload.targetUnits || 0,
    priorityBloodGroups: payload.priorityBloodGroups || [],
    contactPhone: payload.contactPhone || ''
  });
}

function buildCampaignFilter(params) {
  const filter = { isActive: true };
  const now = new Date();

  if (params.organizer) filter.organizer = params.organizer;

  // Status is derived, so it is translated into date comparisons here
  if (params.status === 'upcoming') filter.startDate = { $gt: now };
  if (params.status === 'ongoing') {
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }
  if (params.status === 'completed') filter.endDate = { $lt: now };

  if (params.bloodGroup) filter.priorityBloodGroups = params.bloodGroup;

  if (params.lat && params.lng) {
    const radiusKm = Number(params.radius) || 10;
    filter.location = {
      $geoWithin: {
        $centerSphere: [[Number(params.lng), Number(params.lat)], radiusKm / 6378.1]
      }
    };
  }

  return filter;
}

async function listCampaigns(params) {
  const filter = buildCampaignFilter(params);

  const campaigns = await Campaign.find(filter)
    .populate('organizer', 'name email phone role')
    .sort({ startDate: 1 });

  return { results: campaigns, total: campaigns.length, appliedFilters: filter };
}

/**
 * Registers a donor for a campaign. Rejects registration for campaigns
 * that have already ended, and annotates the response with the donor's
 * current eligibility so organisers know who to expect.
 */
async function registerDonor(campaignId, donorId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw notFound('Campaign not found.');
  if (!campaign.isActive) throw badRequest('This campaign has been cancelled.');
  if (campaign.status === 'completed') {
    throw badRequest('This campaign has already ended.');
  }

  const donor = await Donor.findById(donorId);
  if (!donor) throw notFound('Donor not found.');

  const registration = await CampaignRegistration.create({
    campaign: campaignId,
    donor: donorId
  });

  campaign.registeredCount += 1;
  await campaign.save();

  const eligibility = checkEligibility(donor);

  return {
    registration,
    donorName: donor.name,
    bloodGroup: donor.bloodGroup,
    currentlyEligible: eligibility.eligible,
    eligibilityNotes: eligibility.reasons,
    nextEligibleDate: eligibility.nextEligibleDate
  };
}

async function getCampaignRegistrations(campaignId) {
  return CampaignRegistration.find({ campaign: campaignId })
    .populate('donor', 'name email phone bloodGroup isAvailable totalDonations')
    .sort({ registeredAt: -1 });
}

/**
 * Marks attendance and, if the donor donated, updates campaign totals.
 */
async function recordAttendance(registrationId, { attended, donated, unitsDonated }) {
  const registration = await CampaignRegistration.findById(registrationId);
  if (!registration) throw notFound('Registration not found.');

  registration.attended = attended !== undefined ? attended : registration.attended;
  registration.donated = donated !== undefined ? donated : registration.donated;

  if (donated && unitsDonated) {
    const delta = Number(unitsDonated) - registration.unitsDonated;
    registration.unitsDonated = Number(unitsDonated);

    const campaign = await Campaign.findById(registration.campaign);
    if (campaign) {
      campaign.unitsCollected = Math.max(campaign.unitsCollected + delta, 0);
      await campaign.save();
    }
  }

  await registration.save();
  return registration;
}

module.exports = {
  createCampaign,
  listCampaigns,
  registerDonor,
  getCampaignRegistrations,
  recordAttendance,
  buildCampaignFilter
};