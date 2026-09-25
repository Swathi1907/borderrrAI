const { generateOtp } = require("../services/otpService");
const { generateToken } = require("../services/tokenService");
const {
  saveOtp,
  getOtp,
  deleteOtp,
} = require("../services/otpStore");
const { sendOtpEmail } = require("../services/emailService");
const User = require("../models/userModel");

const requestOtp = async (req, res) => {
  try {
    const { employeeId } = req.body;

    const user = await User.findOne({
      employeeId,
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const otp = generateOtp();

    saveOtp(employeeId, otp);

    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Request OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP",
    });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { employeeId, otp } = req.body;

    if (!employeeId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and OTP are required",
      });
    }

    const user = await User.findOne({
      employeeId,
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const storedOtp = getOtp(employeeId);

    if (!storedOtp) {
      return res.status(401).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    if (Date.now() > storedOtp.expiresAt) {
      deleteOtp(employeeId);

      return res.status(401).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (storedOtp.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    deleteOtp(employeeId);

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP",
    });
  }
};
module.exports = {
  requestOtp,
  verifyOtp,
};