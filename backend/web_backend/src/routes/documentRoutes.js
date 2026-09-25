const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const { uploadDocument } = require("../controllers/documentController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images are allowed"));
    }

    cb(null, true);
  },
});

router.post(
  "/upload",
  authMiddleware,
  upload.fields([
    { name: "passport", maxCount: 1 },
    { name: "visa", maxCount: 1 },
    { name: "liveImage", maxCount: 1 },
  ]),
  uploadDocument
);

module.exports = router;