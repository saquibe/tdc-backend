import mongoose from 'mongoose';

const basicUserSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  mobile_number: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },

  // 🔑 Password Reset fields
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // 🆔 Membership & Relationship
  membership_id: {
    type: String,
    unique: true,
    sparse: true
  },

  // 🔗 Reference to all user applications
  applications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  // 📄 Profile details (filled after approval)
  category: { type: String },
  name_in_full: { type: String },
  gender: { type: String },
  father_name: { type: String },
  mother_name: { type: String },
  place_dob: { type: String },
  nationality: { type: String },
  address: { type: String },
  qualification_description: { type: String },
  aadhaar_number: { type: String },
  pan_number: { type: String },

  // 📌 Keep track of latest application
  last_application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  last_application_status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }

}, { timestamps: true });

export default mongoose.model('BasicUser', basicUserSchema);
