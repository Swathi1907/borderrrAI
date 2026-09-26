const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    employeeId: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "PROCESSING",
        "ML_COMPLETED",
        "SUMSUB_COMPLETED",
        "COMPLETED",
        "FAILED",
      ],
      default: "PROCESSING",
    },

    // Complete JSON returned by custom ML service
    mlResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Complete JSON returned by Sumsub
    sumsubResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Useful Sumsub identifiers
    sumsubApplicantId: {
      type: String,
      default: null,
    },

    sumsubExternalUserId: {
      type: String,
      default: null,
    },

    mlDocumentId: {
      type: String,
      default: null,
    },

    mlRequestId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Verification",
  verificationSchema
);