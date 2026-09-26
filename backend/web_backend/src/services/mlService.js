const axios = require("axios");

const sendDocumentToML = async ({
  passportBuffer,
  visaBuffer,
  liveImageBuffer,
  documentId,
  requestId,
  docType,
}) => {
  try {
    const mlRequestId = Date.now();

    // Convert all 3 uploaded images to Base64
    const passportBase64 = passportBuffer.toString("base64");
    const visaBase64 = visaBuffer.toString("base64");
    const liveImageBase64 = liveImageBuffer.toString("base64");

    console.log("Sending 3 images to ML:");
    console.log(
      "URL:",
      `${process.env.ML_SERVICE_URL}/predict`
    );
    console.log("Document ID:", documentId);
    console.log("Request ID:", requestId);
    console.log("doc_id:", docType);
    console.log("ML request_id:", mlRequestId);

    console.log(
      "Passport Base64 length:",
      passportBase64.length
    );

    console.log(
      "Visa Base64 length:",
      visaBase64.length
    );

    console.log(
      "Live image Base64 length:",
      liveImageBase64.length
    );

    const response = await axios.post(
      `${process.env.ML_SERVICE_URL}/predict`,
      {
        passPortPayload: {
          image_base64: passportBase64,
        },

        visaPayload: {
          image_base64: visaBase64,
        },

        liveImagePayload: {
          image_base64: liveImageBase64,
        },
      },
      {
        headers: {
          "doc-id": docType,
          "request-id": mlRequestId,

          "X-Document-ID": documentId,
          "X-Request-ID": requestId,
        },

        timeout: 60000,

        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
      }
    );

    const scores = {
      mrz_confidence: null,
      face_confidence: null,
      face_similarity: null,
      tampering_score: null,
      tampered: null,
      photo_spliced: null,
      ocr_confidence: null,
      security_confidence: null,
      risk_score: null,
      ...(response.data?.scores || {}),
    };

    const result = {
      ...response.data,
      scores,
    };

    console.log("ML response:");
    console.log(result);

    return result;
  } catch (error) {
    console.error("ML STATUS:", error.response?.status);

    console.error(
      "ML RESPONSE:",
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    console.error(
      "ML MESSAGE:",
      error.message
    );

    throw new Error("ML service request failed");
  }
};

module.exports = {
  sendDocumentToML,
};