// src/controllers/paymentController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import RegistrationCategory from "../models/RegistrationCategory.js";

// Initialize Razorpay as a function that returns the instance
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    console.log("🔧 Initializing Razorpay...");
    console.log("Key ID:", process.env.RAZORPAY_KEY_ID ? "✅ Set" : "❌ Missing");
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing!");
      console.error("Please check your .env file");
      
      // For development/testing, create a mock instance
      if (process.env.NODE_ENV === 'development') {
        console.log("⚠️  Creating mock Razorpay for development");
        razorpayInstance = {
          orders: {
            create: async (options) => {
              console.log("📝 Mock Razorpay - Creating order:", options);
              return {
                id: `mock_order_${Date.now()}`,
                amount: options.amount,
                currency: options.currency,
                receipt: options.receipt,
                status: 'created',
                created_at: Math.floor(Date.now() / 1000)
              };
            }
          },
          payments: {
            fetch: async (paymentId) => {
              console.log("📝 Mock Razorpay - Fetching payment:", paymentId);
              return {
                id: paymentId,
                status: 'captured',
                method: 'card',
                bank: 'TEST BANK',
                wallet: null,
                vpa: null,
                email: 'test@example.com',
                contact: '9999999999',
                fee: 0,
                tax: 0,
                created_at: Math.floor(Date.now() / 1000)
              };
            }
          }
        };
      } else {
        throw new Error("Razorpay credentials are required for production");
      }
    } else {
      // Real Razorpay initialization
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      console.log("✅ Razorpay initialized successfully");
    }
  }
  return razorpayInstance;
};

// Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", notes = {} } = req.body;
    const basicUser = req.user;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();

    // Calculate amount in paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        basic_user_id: basicUser._id.toString(),
        ...notes,
      },
    };

    // Create order in Razorpay
    const order = await razorpay.orders.create(options);

    // Save payment record in database
    const payment = await Payment.create({
      basic_user_id: basicUser._id,
      order_id: order.id,
      amount: amount,
      currency,
      status: "created",
      notes: {
        registration_category: notes.registration_category,
        application_type: notes.application_type || "New Registration",
      },
    });

    console.log("📦 Order created:", order.id, "for user:", basicUser._id);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      payment_id: payment._id,
    });
  } catch (error) {
    console.error("❌ Order creation error:", error);
    res.status(500).json({ 
      error: "Failed to create order",
      details: error.message,
      env_check: {
        razorpay_key_set: !!process.env.RAZORPAY_KEY_ID,
        node_env: process.env.NODE_ENV
      }
    });
  }
};

// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const basicUser = req.user;

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();

    // Check if this is a mock payment
    if (razorpay_order_id && razorpay_order_id.startsWith('mock_')) {
      console.log("⚠️  Processing mock payment verification");
      
      const updatedPayment = await Payment.findOneAndUpdate(
        { order_id: razorpay_order_id, basic_user_id: basicUser._id },
        {
          payment_id: razorpay_payment_id || `mock_payment_${Date.now()}`,
          status: "paid",
          payment_method: "card",
          razorpay_response: { 
            mock: true,
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id
          },
        },
        { new: true }
      );

      if (!updatedPayment) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      return res.json({
        success: true,
        message: "Mock payment verified successfully",
        payment: {
          id: updatedPayment._id,
          order_id: updatedPayment.order_id,
          payment_id: updatedPayment.payment_id,
          amount: updatedPayment.amount,
          status: updatedPayment.status,
          currency: updatedPayment.currency,
        },
      });
    }

    // Real payment verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Invalid signature for order:", razorpay_order_id);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Update payment record in database
    const updatedPayment = await Payment.findOneAndUpdate(
      { order_id: razorpay_order_id, basic_user_id: basicUser._id },
      {
        payment_id: razorpay_payment_id,
        status: payment.status === "captured" ? "paid" : payment.status,
        payment_method: payment.method,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
        email: payment.email,
        contact: payment.contact,
        fee: payment.fee ? payment.fee / 100 : 0,
        tax: payment.tax ? payment.tax / 100 : 0,
        razorpay_response: payment,
      },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    console.log("✅ Payment verified:", razorpay_payment_id);

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: updatedPayment._id,
        order_id: updatedPayment.order_id,
        payment_id: updatedPayment.payment_id,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        currency: updatedPayment.currency,
      },
    });
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    res.status(500).json({ 
      error: "Payment verification failed",
      details: error.message 
    });
  }
};

// Get Payment Status
export const getPaymentStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const basicUser = req.user;

    const payment = await Payment.findOne({
      order_id,
      basic_user_id: basicUser._id,
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        order_id: payment.order_id,
        payment_id: payment.payment_id,
        amount: payment.amount,
        status: payment.status,
        currency: payment.currency,
        created_at: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ error: "Failed to get payment status" });
  }
};

// Calculate Registration Fee
export const calculateFee = async (req, res) => {
  try {
    const { registration_category, registration_type } = req.body;

    if (!registration_category || !registration_type) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const category = await RegistrationCategory.findOne({
      name: registration_category,
    });

    if (!category) {
      return res.status(404).json({ error: "Registration category not found" });
    }

    let amount = 0;
    const isTatkal = registration_type.includes("Tatkal");

    if (isTatkal) {
      amount = category.tatkal_amount;
    } else {
      amount = category.regular_amount;
    }

    // Add GST if applicable (18%)
    const gst = Math.round(amount * 0.18);
    const totalAmount = amount + gst;

    res.json({
      success: true,
      fee_breakdown: {
        registration_fee: amount,
        gst: gst,
        total_amount: totalAmount,
      },
      currency: "INR",
    });
  } catch (error) {
    console.error("Fee calculation error:", error);
    res.status(500).json({ error: "Failed to calculate fee" });
  }
};