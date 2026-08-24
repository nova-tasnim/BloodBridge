const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true,
      default: 'general'
    },

    translations: {
      en: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },

      bn: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

translationSchema.index({
  category: 1,
  key: 1
});

module.exports =
  mongoose.model(
    'Translation',
    translationSchema
  );