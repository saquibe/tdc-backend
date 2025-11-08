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

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  membership_id: {
    type: String,
    unique: true,
    sparse: true
  },

  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // 🧩 Extended profile info
  category: String,
  name_in_full: String,
  gender: String,
  father_name: String,
  mother_name: String,
  place: String, // ✅ Added
  dob: Date, // ✅ Added
  nationality_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nationality', // ✅ Link nationality for consistency
  },
  address: String,
  qualification_description: String,
  aadhaar_number: String,
  pan_number: String,

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
