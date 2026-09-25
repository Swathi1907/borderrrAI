const crypto = require("crypto");

const {
  createApplicant,
  uploadDocumentToSumsub,
} = require("../services/sumsubService");

const uploadSumsubDocument = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    const {
      documentType,
      country,
    } = req.body;

  
    const allowedTypes = [
      "NATIONAL_ID",
      "DRIVING_LICENSE",
    ];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message:
          "documentType must be NATIONAL_ID or DRIVING_LICENSE",
      });
    }

    if (!country || country.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "3-letter ISO country code is required",
      });
    }

    const requestId = `REQ-${crypto.randomUUID()}`;
    const externalUserId =
      `${req.user.employeeId}-${requestId}`;

    console.log("Creating Sumsub applicant...");
    console.log("External User ID:", externalUserId);

    const applicant = await createApplicant({
      externalUserId,
    });

    console.log(
      "Sumsub applicant created:",
      applicant.id
    );

    let sumsubDocumentType;

    if (documentType === "NATIONAL_ID") {
      sumsubDocumentType = "ID_CARD";
    }

    if (documentType === "DRIVING_LICENSE") {
      sumsubDocumentType = "DRIVERS";
    }

   
    console.log("Uploading document to Sumsub...");

    const sumsubResult =
      await uploadDocumentToSumsub({
        applicantId: applicant.id,

        buffer: req.file.buffer,

        fileName: req.file.originalname,

        mimeType: req.file.mimetype,

        documentType: sumsubDocumentType,

        country: country.toUpperCase(),
      });

    console.log("Sumsub document uploaded");

    return res.status(200).json({
      success: true,

      message:
        "Document uploaded to Sumsub successfully",

      requestId,

      applicantId: applicant.id,

      externalUserId,

      documentType,

      sumsubDocumentType,

      country: country.toUpperCase(),

      sumsubResult,
    });

  } catch (error) {

    console.error(
      "Sumsub document error:"
    );

    console.error(
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Sumsub verification request failed",
      error:
        error.response?.data ||
        error.message,
    });
  }
};

module.exports = {
  uploadSumsubDocument,
};