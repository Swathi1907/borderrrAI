const crypto = require("crypto");

const Verification = require("../models/verificationModel");

const {
  createApplicant,
  uploadDocumentToSumsub,
} = require("../services/sumsubService");


const uploadSumsubDocument = async (req, res) => {

  let verification = null;

  try {

    const frontFile =
      req.files?.idFront?.[0];

    const backFile =
      req.files?.idBack?.[0];



    if (!frontFile) {

      return res.status(400).json({
        success: false,
        message:
          "Front document image is required",
      });

    }


    const {
      documentType,
      country,
      verificationId,
    } = req.body;

    if (!verificationId) {

      return res.status(400).json({
        success: false,
        message:
          "verificationId is required",
      });

    }


    verification =
      await Verification.findOne({
        verificationId,
        employeeId:
          req.user.employeeId,
      });


    if (!verification) {

      return res.status(404).json({
        success: false,
        message:
          "Verification record not found",
      });

    }


    const allowedTypes = [
      "NATIONAL_ID",
      "DRIVING_LICENSE",
    ];


    if (
      !allowedTypes.includes(documentType)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "documentType must be NATIONAL_ID or DRIVING_LICENSE",
      });

    }


   
    if (
      !country ||
      country.length !== 3
    ) {

      return res.status(400).json({
        success: false,
        message:
          "3-letter ISO country code is required",
      });

    }


    const requestId =
      `REQ-${crypto.randomUUID()}`;

    const externalUserId =
      `${req.user.employeeId}-${requestId}`;


    console.log(
      "Creating Sumsub applicant..."
    );

    console.log(
      "Verification ID:",
      verificationId
    );

    console.log(
      "External User ID:",
      externalUserId
    );


    const applicant =
      await createApplicant({
        externalUserId,
      });


    console.log(
      "Sumsub applicant created:",
      applicant.id
    );


    
    let sumsubDocumentType;


    if (
      documentType === "NATIONAL_ID"
    ) {

      sumsubDocumentType =
        "ID_CARD";

    }


    if (
      documentType === "DRIVING_LICENSE"
    ) {

      sumsubDocumentType =
        "DRIVERS";

    }


    const normalizedCountry =
      country.toUpperCase();


    console.log(
      "Uploading FRONT side..."
    );


    const frontResult =
      await uploadDocumentToSumsub({

        applicantId:
          applicant.id,

        buffer:
          frontFile.buffer,

        fileName:
          frontFile.originalname,

        mimeType:
          frontFile.mimetype,

        documentType:
          sumsubDocumentType,

        country:
          normalizedCountry,

        side:
          "FRONT_SIDE",
      });


    console.log(
      "Front side uploaded successfully"
    );


    let backResult = null;


    if (backFile) {

      console.log(
        "Uploading BACK side..."
      );


      backResult =
        await uploadDocumentToSumsub({

          applicantId:
            applicant.id,

          buffer:
            backFile.buffer,

          fileName:
            backFile.originalname,

          mimeType:
            backFile.mimetype,

          documentType:
            sumsubDocumentType,

          country:
            normalizedCountry,

          side:
            "BACK_SIDE",
        });


      console.log(
        "Back side uploaded successfully"
      );

    }


    const sumsubResult = {

      success: true,

      requestId,

      applicantId:
        applicant.id,

      externalUserId,

      documentType,

      sumsubDocumentType,

      country:
        normalizedCountry,

      frontUploaded:
        true,

      backUploaded:
        !!backFile,

      frontResult,

      backResult,

    };

    verification.sumsubResult =
      sumsubResult;

    verification.sumsubApplicantId =
      applicant.id;

    verification.sumsubExternalUserId =
      externalUserId;


   
    verification.status =
      "COMPLETED";


    await verification.save();


    console.log(
      "Verification updated successfully:",
      verificationId
    );


    return res.status(200).json({

      success: true,

      message:
        "Sumsub documents uploaded and verification record updated successfully",

      verificationId,

      status:
        verification.status,

      sumsubResult,

    });


  } catch (error) {

    console.error(
      "Sumsub document error:"
    );

    console.error(
      error.response?.data ||
      error.message
    );


    if (verification) {

      verification.status =
        "FAILED";

      await verification.save();

    }


    return res.status(500).json({

      success: false,

      message:
        "Sumsub verification request failed",

      error:
        error.response?.data ||
        error.message,

    });

  }

};


module.exports = {
  uploadSumsubDocument,
};