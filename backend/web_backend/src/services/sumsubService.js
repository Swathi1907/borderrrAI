const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = process.env.SUMSUB_BASE_URL;
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME;

const generateSignature = ({
  timestamp,
  method,
  path,
  body,
}) => {

  const hmac = crypto.createHmac(
    "sha256",
    SECRET_KEY
  );

  hmac.update(timestamp);
  hmac.update(method.toUpperCase());
  hmac.update(path);

  if (body) {
    hmac.update(body);
  }

  return hmac.digest("hex");
};


const createApplicant = async ({
  externalUserId,
}) => {

  const path =
    `/resources/applicants?levelName=${encodeURIComponent(
      LEVEL_NAME
    )}`;

  const bodyObject = {
    externalUserId,
  };

  const body = JSON.stringify(bodyObject);

  const timestamp =
    Math.floor(Date.now() / 1000).toString();

  const signature = generateSignature({
    timestamp,
    method: "POST",
    path,
    body,
  });

  const response = await axios.post(
    `${BASE_URL}${path}`,
    body,
    {
      headers: {
        "Content-Type": "application/json",

        "X-App-Token": APP_TOKEN,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": timestamp,
      },

      timeout: 30000,
    }
  );

  return response.data;
};



const uploadDocumentToSumsub = async ({
  applicantId,
  buffer,
  fileName,
  mimeType,
  documentType,
  country,
}) => {

  const path =
    `/resources/applicants/${applicantId}/info/idDoc`;

  const form = new FormData();

  const metadata = JSON.stringify({
    idDocType: documentType,
    country,
  });

  form.append(
    "metadata",
    metadata
  );

  form.append(
    "content",
    buffer,
    {
      filename: fileName,
      contentType: mimeType,
    }
  );

  const body = form.getBuffer();

  const timestamp =
    Math.floor(Date.now() / 1000).toString();

  const signature = generateSignature({
    timestamp,
    method: "POST",
    path,
    body,
  });

  const response = await axios.post(
    `${BASE_URL}${path}`,
    body,
    {
      headers: {
        ...form.getHeaders(),

        "X-App-Token": APP_TOKEN,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": timestamp,

        "X-Return-Doc-Warnings": "true",
      },

      maxContentLength:
        50 * 1024 * 1024,

      maxBodyLength:
        50 * 1024 * 1024,

      timeout: 60000,
    }
  );

  return response.data;
};


module.exports = {
  createApplicant,
  uploadDocumentToSumsub,
};