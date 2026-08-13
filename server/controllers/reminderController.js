const Donor = require('../models/Donor');
const Reminder = require('../models/Reminder');

// Standard waiting period between donations (in days)
const ELIGIBILITY_WAIT_DAYS = 90;

// Calculate next eligible donation date for a donor
function calculateNextEligibleDate(lastDonationDate) {
  if (!lastDonationDate) return new Date(); // eligible now if never donated
  const nextDate = new Date(lastDonationDate);
  nextDate.setDate(nextDate.getDate() + ELIGIBILITY_WAIT_DAYS);
  return nextDate;
}

// GET next eligible date for a specific donor
exports.getNextEligibleDate = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.donorId);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const nextEligibleDate = calculateNextEligibleDate(donor.lastDonationDate);
    const isEligibleNow = new Date() >= nextEligibleDate;

    res.json({ nextEligibleDate, isEligibleNow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create/update reminder record for a donor
exports.createReminder = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.donorId);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const nextEligibleDate = calculateNextEligibleDate(donor.lastDonationDate);

    const reminder = await Reminder.findOneAndUpdate(
      { donorId: donor._id },
      { nextEligibleDate, reminderSent: false },
      { upsert: true, new: true }
    );

    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all donors who are due for a reminder (eligible within next 7 days)
exports.getDueReminders = async (req, res) => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const dueReminders = await Reminder.find({
      nextEligibleDate: { $lte: sevenDaysFromNow },
      reminderSent: false
    }).populate('donorId', 'name email phone bloodGroup');

    res.json(dueReminders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark a reminder as sent
exports.markReminderSent = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.reminderId,
      { reminderSent: true, reminderDate: new Date() },
      { new: true }
    );
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};