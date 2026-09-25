const crypto = require("crypto");
const Document = require("../models/documentModel");

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    const documentId = `DOC-${crypto.randomUUID()}`;
    const requestId = `REQ-${crypto.randomUUID()}`;

    const document = await Document.create({
      documentId,
      requestId,

      employeeId: req.user.employeeId,

      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,

      status: "UPLOADED",
    });

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",

      documentId: document.documentId,
      requestId: document.requestId,

      fileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: req.file.size,

      status: document.status,
    });
  } catch (error) {
    console.error("Document upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Document upload failed",
    });
  }
};

module.exports = {
  uploadDocument,
};