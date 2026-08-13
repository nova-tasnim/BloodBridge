const Donor = require('../models/Donor');
const Badge = require('../models/Badge');
const DonationRecord = require('../models/DonationRecord');

// Milestone definitions
const MILESTONES = [
  { name: 'First Donation', donationsRequired: 1 },
  { name: 'Bronze Donor', donationsRequired: 5 },
  { name: 'Silver Donor', donationsRequired: 10 },
  { name: 'Gold Donor', donationsRequired: 25 }
];

// Check and award badges for a donor based on their donation count
exports.checkAndAwardBadges = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.donorId);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const donationCount = await DonationRecord.countDocuments({ donorId: donor._id });

    const newBadges = [];
    for (const milestone of MILESTONES) {
      if (donationCount >= milestone.donationsRequired) {
        let badge = await Badge.findOne({ name: milestone.name });
        if (!badge) {
          badge = await Badge.create({
            name: milestone.name,
            criteria: `${milestone.donationsRequired} donations`,
            donationsRequired: milestone.donationsRequired
          });
        }
        if (!donor.badges.includes(badge._id)) {
          donor.badges.push(badge._id);
          newBadges.push(badge);
        }
      }
    }

    // Update lives saved (assume 1 donation = up to 3 lives saved, standard blood donation stat)
    donor.livesSaved = donationCount * 3;

    await donor.save();

    res.json({ donor, newBadges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get leaderboard (top donors by lives saved)
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Donor.find()
      .sort({ livesSaved: -1 })
      .limit(20)
      .select('name livesSaved badges')
      .populate('badges', 'name');

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a specific donor's badges
exports.getDonorBadges = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.donorId).populate('badges');
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json({ badges: donor.badges, livesSaved: donor.livesSaved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};