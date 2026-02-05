// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  basic_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BasicUser",
    required: true,
  },
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  payment_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "INR",
  },
  status: {
    type: String,
    enum: ["created", "attempted", "paid", "failed", "refunded"],
    default: "created",
  },
  payment_method: String,
  bank: String,
  wallet: String,
  vpa: String,
  email: String,
  contact: String,
  fee: Number,
  tax: Number,
  error_code: String,
  error_description: String,
  notes: {
    registration_category: String,
    application_type: String,
    temporary_id: String,
  },
  razorpay_response: Object,
  refunds: [
    {
      refund_id: String,
      amount: Number,
      status: String,
      created_at: Date,
    },
  ],
  metadata: Object,
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ order_id: 1 });
paymentSchema.index({ payment_id: 1 });
paymentSchema.index({ user_id: 1, status: 1 });
paymentSchema.index({ created_at: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;