const crypto = require("crypto");
const Document = require("../models/documentModel");
const { sendDocumentToML } = require("../services/mlService");

const uploadDocument = async (req, res) => {
  let document = null;

  try {
    // 1. Get all three uploaded images
    const passportFile = req.files?.passport?.[0];
    const visaFile = req.files?.visa?.[0];
    const liveImageFile = req.files?.liveImage?.[0];

    // 2. Check all three files
    if (!passportFile || !visaFile || !liveImageFile) {
      return res.status(400).json({
        success: false,
        message: "Passport, visa, and live image are required",
      });
    }

    // 3. Generate IDs
    const documentId = `DOC-${crypto.randomUUID()}`;
    const requestId = `REQ-${crypto.randomUUID()}`;

    // 4. Create MongoDB record
    document = await Document.create({
      documentId,
      requestId,

      employeeId: req.user.employeeId,

      originalFileName: passportFile.originalname,
      mimeType: passportFile.mimetype,

      status: "PROCESSING",
    });

    console.log("Document created:", documentId);
    console.log("Request ID:", requestId);
    console.log("Sending passport + visa + live image to ML service...");

    // 5. Send all three images to FastAPI
    const mlResult = await sendDocumentToML({
      passportBuffer: passportFile.buffer,
      visaBuffer: visaFile.buffer,
      liveImageBuffer: liveImageFile.buffer,

      documentId,
      requestId,
      docType: 3,
    });

    console.log("ML service response received:");
    console.log(mlResult);

    // 6. Save ML result
    document.mlResult = mlResult;
    document.status = "COMPLETED";

    await document.save();

    // 7. Return result
    return res.status(200).json({
      success: true,
      message: "Documents processed successfully",

      documentId: document.documentId,
      requestId: document.requestId,

      passportFileName: passportFile.originalname,
      visaFileName: visaFile.originalname,
      liveImageFileName: liveImageFile.originalname,

      status: document.status,

      mlResult: document.mlResult,
    });
  } catch (error) {
    console.error("Document processing error:", error);

    // If MongoDB record was already created
    if (document) {
      document.status = "FAILED";
      await document.save();
    }

    return res.status(500).json({
      success: false,
      message: "Document processing failed",
    });
  }
};

module.exports = {
  uploadDocument,
};