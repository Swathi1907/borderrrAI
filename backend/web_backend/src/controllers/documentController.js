const crypto = require("crypto");

const Document = require("../models/documentModel");
const Verification = require("../models/verificationModel");

const {
  sendDocumentToML,
} = require("../services/mlService");


const uploadDocument = async (req, res) => {

  let document = null;
  let verification = null;

  try {

    const passportFile =
      req.files?.passport?.[0];

    const visaFile =
      req.files?.visa?.[0];

    const liveImageFile =
      req.files?.liveImage?.[0];


  
    if (
      !passportFile ||
      !visaFile ||
      !liveImageFile
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Passport, visa, and live image are required",
      });

    }

    const documentId =
      `DOC-${crypto.randomUUID()}`;

    const requestId =
      `REQ-${crypto.randomUUID()}`;

    const verificationId =
      `VER-${crypto.randomUUID()}`;


    
    document = await Document.create({

      documentId,

      requestId,

      employeeId:
        req.user.employeeId,

      originalFileName:
        passportFile.originalname,

      mimeType:
        passportFile.mimetype,

      status:
        "PROCESSING",
    });


    verification =
      await Verification.create({

        verificationId,

        employeeId:
          req.user.employeeId,

        status:
          "PROCESSING",

        mlDocumentId:
          documentId,

        mlRequestId:
          requestId,
      });


    console.log(
      "Verification created:",
      verificationId
    );


    console.log(
      "Sending passport + visa + live image to ML..."
    );


    const mlResult =
      await sendDocumentToML({

        passportBuffer:
          passportFile.buffer,

        visaBuffer:
          visaFile.buffer,

        liveImageBuffer:
          liveImageFile.buffer,

        documentId,

        requestId,

        docType: 3,
      });


    console.log(
      "ML service response received:"
    );

    console.log(mlResult);

   document.mlResult =
      mlResult;

    document.status =
      "COMPLETED";

    await document.save();


    verification.mlResult =
      mlResult;

    verification.status =
      "ML_COMPLETED";

    await verification.save();


 
    return res.status(200).json({

      success: true,

      message:
        "Passport, visa and live image processed successfully",

      verificationId,

      documentId,

      requestId,

      status:
        verification.status,

      mlResult,

    });


  } catch (error) {

    console.error(
      "Document processing error:",
      error
    );


    // Mark document as failed
    if (document) {

      document.status =
        "FAILED";

      await document.save();

    }


    // Mark verification as failed
    if (verification) {

      verification.status =
        "FAILED";

      await verification.save();

    }


    return res.status(500).json({

      success: false,

      message:
        "Document processing failed",

    });

  }
};


module.exports = {
  uploadDocument,
};