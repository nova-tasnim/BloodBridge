const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const { User } = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Create an in-app notification
exports.createNotification = async (userId, message, type) => {
  return await Notification.create({ userId, message, type });
};

// Send email to a user
async function sendEmail(toEmail, subject, message) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      text: message
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

// Notify top-ranked matched donors (in-app + email)
exports.notifyMatchedDonors = async (req, res) => {
  try {
    const { donorIds, requestId, message } = req.body;

    const results = [];
    for (const donorId of donorIds) {
      const donor = await User.findById(donorId);
      if (!donor) continue;

      const notification = await Notification.create({
        userId: donorId,
        message: message || `You have been matched to blood request ${requestId}`,
        type: 'match'
      });

      await sendEmail(donor.email, 'BloodBridge — You Have Been Matched', notification.message);

      results.push(notification);
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};