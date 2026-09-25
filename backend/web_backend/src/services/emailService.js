const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendOtpEmail = async (email, otp) => {
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "BorderAI",
        email: process.env.EMAIL_FROM,
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "Your Login OTP",
      textContent: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    console.log("OTP email sent:", result.messageId);

    return result;
  } catch (error) {
    console.error("Brevo email error:", error);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendOtpEmail,
};