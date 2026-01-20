import axios from "axios";

const sendEmail = async ({ email, subject, message }) => {
  try {
    await axios.post(
      process.env.ZEPTO_URL,
      {
        from: { address: process.env.ZEPTO_FROM },
        to: [
          {
            email_address: {
              address: email,
            },
          },
        ],
        subject,
        htmlbody: message,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.ZEPTO_TOKEN, // ✅ NO double prefix
        },
      }
    );
  } catch (error) {
    console.error("ZeptoMail Error:", error.response?.data || error.message);
    throw new Error("Email sending failed");
  }
};

export default sendEmail;
