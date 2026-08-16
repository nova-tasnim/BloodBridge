const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const { BloodRequest } = require('../models/BloodRequest');
const DonationRecord = require('../models/DonationRecord');

// Submit feedback — validates the target is actually completed first
exports.submitFeedback = async (req, res) => {
  try {
    const { userId, targetType, targetId, rating, comment } = req.body;

    if (!userId || !targetType || !targetId || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate the target exists and is in a completed state
    if (targetType === 'request') {
      const request = await BloodRequest.findById(targetId);

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      if (request.status !== 'fulfilled') {
        return res.status(400).json({
          message: 'Feedback only allowed on fulfilled requests'
        });
      }
    } else if (targetType === 'donation') {
      const donation = await DonationRecord.findById(targetId);

      if (!donation) {
        return res.status(404).json({
          message: 'Donation record not found'
        });
      }
    } else {
      return res.status(400).json({
        message: 'Invalid targetType'
      });
    }

    const feedback = await Feedback.create({
      userId,
      targetType,
      targetId,
      rating,
      comment
    });

    res.status(201).json(feedback);
  } catch (err) {
    // Duplicate feedback attempt
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'You have already submitted feedback for this'
      });
    }

    res.status(500).json({ message: err.message });
  }
};

// Get all feedback for a specific target
exports.getFeedbackForTarget = async (req, res) => {
  try {
    const { targetId } = req.params;

    const feedback = await Feedback.find({ targetId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get average rating for a target
exports.getAverageRating = async (req, res) => {
  try {
    const { targetId } = req.params;

    const result = await Feedback.aggregate([
      {
        $match: {
          targetId: new mongoose.Types.ObjectId(targetId)
        }
      },
      {
        $group: {
          _id: '$targetId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0
      });
    }

    res.json({
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get recent feedback across the platform
exports.getRecentFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const feedback = await Feedback.find()
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};