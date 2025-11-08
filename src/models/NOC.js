import mongoose from 'mongoose';

const nocSchema = new mongoose.Schema({
  basic_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BasicUser',
    required: true,
  },

  applicationNo: {
    type: String,
    required: true,
    unique: true,
  },

  name: {
    type: String,
    required: true,
  },

  membership_id: {
    type: String,
    required: [true, 'Membership ID is required'],
  },

  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true,
  },

  dental_council_name: {
    type: String,
    required: [true, 'Transferee Dental Council name is required'],
  },

  tdc_reg_certificate_upload: {
    type: String,
    required: [true, 'TDC registration certificate is required'],
  },

  aadhaar_upload: {
    type: String,
    required: [true, 'Aadhaar photocopy is required'],
  },

  postal_address: {
    type: String,
    required: [true, 'Postal address is required'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

nocSchema.virtual('applicationDate').get(function() {
  return this.updatedAt > this.createdAt ? this.updatedAt : this.createdAt;
});

const NOC = mongoose.model('NOC', nocSchema);
export default NOC;
