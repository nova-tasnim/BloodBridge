const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const { BloodRequest } = require('../models/BloodRequest');
const DonationRecord = require('../models/DonationRecord');

function isAdmin(user) {
  return user?.role === 'Admin';
}

// Submit feedback for an eligible completed target.
// The authenticated user is always the feedback author.
exports.submitFeedback = async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      rating,
      comment = ''
    } = req.body || {};

    if (
      !targetType ||
      !targetId ||
      rating === undefined
    ) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    // Feedback for a fulfilled blood request
    if (targetType === 'request') {
      const request = await BloodRequest.findById(targetId);

      if (!request) {
        return res.status(404).json({
          message: 'Request not found'
        });
      }

      if (request.status !== 'fulfilled') {
        return res.status(400).json({
          message: 'Feedback only allowed on fulfilled requests'
        });
      }

      const isOwner =
        request.requester.toString() ===
        req.user._id.toString();

      if (!isOwner && !isAdmin(req.user)) {
        return res.status(403).json({
          message:
            'Forbidden — you cannot review this request'
        });
      }
    }

    // Feedback for a verified donation
    else if (targetType === 'donation') {
      const donation =
        await DonationRecord.findById(targetId);

      if (!donation) {
        return res.status(404).json({
          message: 'Donation record not found'
        });
      }

      if (!donation.verifiedBy) {
        return res.status(400).json({
          message:
            'Feedback only allowed on verified donations'
        });
      }

      const ownsDonation =
        donation.donor.toString() ===
          req.user._id.toString();

      if (!ownsDonation && !isAdmin(req.user)) {
        return res.status(403).json({
          message:
            'Forbidden — you cannot review this donation'
        });
      }
    }

    else {
      return res.status(400).json({
        message: 'Invalid targetType'
      });
    }

    // Explicit duplicate protection before creating.
    const existing = await Feedback.findOne({
      userId: req.user._id,
      targetType,
      targetId
    });

    if (existing) {
      return res.status(409).json({
        message:
          'You have already submitted feedback for this item'
      });
    }

    // userId always comes from authentication.
    const feedback = await Feedback.create({
      userId: req.user._id,
      targetType,
      targetId,
      rating: numericRating,
      comment: String(comment).trim()
    });

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message:
          'You have already submitted feedback for this item'
      });
    }

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get all feedback for a specific target
exports.getFeedbackForTarget = async (req, res) => {
  try {
    const { targetId } = req.params;

    const feedback = await Feedback.find({
      targetId
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feedback
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get average rating for a target
exports.getAverageRating = async (req, res) => {
  try {
    const { targetId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(targetId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target ID'
      });
    }

    const result = await Feedback.aggregate([
      {
        $match: {
          targetId:
            new mongoose.Types.ObjectId(targetId)
        }
      },
      {
        $group: {
          _id: '$targetId',
          averageRating: {
            $avg: '$rating'
          },
          totalReviews: {
            $sum: 1
          }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        averageRating:
          Math.round(
            result[0].averageRating * 10
          ) / 10,
        totalReviews:
          result[0].totalReviews
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get recent feedback across the platform
exports.getRecentFeedback = async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      50
    );

    const feedback = await Feedback.find()
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: feedback
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};