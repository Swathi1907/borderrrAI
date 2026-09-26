const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");

const {
  uploadDocument,
} = require("../controllers/documentController");

const {
  uploadSumsubDocument,
} = require("../controllers/sumsubController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});


router.post(
  "/upload",
  authMiddleware,

  upload.fields([
    {
      name: "passport",
      maxCount: 1,
    },
    {
      name: "visa",
      maxCount: 1,
    },
    {
      name: "liveImage",
      maxCount: 1,
    },
  ]),

  uploadDocument
);

router.post(
  "/upload1",
  authMiddleware,

 upload.fields([
    {
      name: "front",
      maxCount: 1,
    },
    {
      name: "back",
      maxCount: 1,
    },
  ]),

  uploadSumsubDocument
);


module.exports = router;