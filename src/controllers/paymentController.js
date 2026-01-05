import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";


dotenv.config();

// ================= Razorpay Instance =================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Corrected variable name
});

// ====================================================
// =============== CREATE PAYMENT ORDER ===============
// ====================================================
export const createPayment = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Fetch user with category
    const user = await User.findById(userId).populate("regcategory_id");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const category = user.regcategory_id;
    if (!category) {
      return res.status(400).json({
        success: false,
        error: "User does not have a valid registration category",
      });
    }

    // 2️⃣ Determine payment type + amount
    const payment_type = user.regtype; // Regular / Tatkal
    const payment_category = category.name;

    let amount;
    if (payment_type.toLowerCase().startsWith("regular")) {
      amount = category.regular_amount;
    } else if (payment_type.toLowerCase().startsWith("tatkal")) {
      amount = category.tatkal_amount;
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid registration type",
      });
    }

    // 3️⃣ Create Razorpay Order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // INR → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    // 4️⃣ Save payment record (PENDING)
    const payment = new Payment({
      user_id: user._id,
      payment_category,
      payment_type,
      amount,
      order_id: razorpayOrder.id,
      payment_status: "Pending",
    });

    await payment.save();

    // 5️⃣ Send data to frontend
    return res.status(201).json({
      success: true,
      message: "Razorpay order created",
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        user: {
          name: user.full_name || `${user.f_name} ${user.l_name}`,
          email: user.email,
          contact: user.mobile_number || user.mobile,
        },
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ====================================================
// =============== VERIFY PAYMENT =====================
// ====================================================
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1️⃣ Signature verification
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) // Corrected variable name
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
      });
    }

    // 2️⃣ Update payment record
    const payment = await Payment.findOneAndUpdate(
      { order_id: razorpay_order_id },
      {
        payment_id: razorpay_payment_id,
        payment_status: "Success",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
