import mongoose from 'mongoose';

const { Schema } = mongoose;

const pgSpecialistEnum = [
  'Prosthodontics and Crown & Bridge',
  'Periodontology',
  'Oral and Maxillofacial Surgery',
  'Conservative Dentistry and Endodontics',
  'Orthodontics and Dentofacial Orthopedics',
  'Oral & Maxillofacial Pathology and Oral Microbiology',
  'Public Health Dentistry',
  'Pediatric and Preventive Dentistry',
  'Oral Medicine and Radiology'
];

const casteCategoryEnum = [
  'Open Category',
  'Backward Classes',
  'Scheduled Castes',
  'Scheduled Tribes'
];

const regTypeEnum = [
  'Regular (By Post - Fee includes postal charges)',
  'Tatkal (By Hand)'
];

const userSchema = new Schema({
  // 🔗 Links to BasicUser (account)
  basic_user_id: { type: Schema.Types.ObjectId, ref: 'BasicUser', required: true },

  // 🆔 Temporary application ID (unique per submission)
  temporary_id: { type: String, required: true, unique: true },

  // 🪪 Permanent Membership ID (assigned once approved)
  membership_id: {
  type: String,
  index: {
    unique: true,
    partialFilterExpression: { membership_id: { $type: "string" } }
  }
},

  // 🟢 Existing fields
  regcategory_id: { type: Schema.Types.ObjectId, ref: 'RegistrationCategory', required: true },
  nationality_id: { type: Schema.Types.ObjectId, ref: 'Nationality', required: true },
  f_name: { type: String, required: [true, 'First name is required'], trim: true },
  m_name: { type: String, trim: true },
  l_name: { type: String, required: [true, 'Last name is required'], trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: [true, 'Gender is required'] },
  father_name: { type: String, required: [true, "Father's name is required"], trim: true },
  mother_name: { type: String, required: [true, "Mother's name is required"], trim: true },
  place: { type: String, required: [true, 'Place is required'] },
  dob: { type: Date, required: [true, 'Date of Birth is required'] },
  category: { type: String, enum: casteCategoryEnum, required: [true, 'Category is required'] },
  email: { type: String, required: [true, 'Email is required'], match: [/^\S+@\S+\.\S+$/, 'Email is invalid'] },
  mobile_number: { type: String, required: [true, 'Mobile number is required'], match: [/^\d{10}$/, 'Mobile number must be 10 digits'] },
  telephone_number: { type: String },
  address: { type: String, required: [true, 'Residential address is required'] },
  pan_number: { type: String, required: [true, 'PAN card number is required'], match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'] },
  pan_upload: { type: String, required: [true, 'PAN upload is required'] },
  aadhaar_number: { type: String, required: [true, 'Aadhaar number is required'], match: [/^\d{12}$/, 'Aadhaar number must be 12 digits'] },
  aadhaar_upload: { type: String, required: [true, 'Aadhaar upload is required'] },
  sign_upload: { type: String, required: [true, 'Signature upload is required'] },
  regtype: { type: String, enum: regTypeEnum, required: [true, 'Registration Type is required'] },

  // Document uploads
  pr_bds_upload: String,
  pr_bonafide_upload: String,
  ssc_memo_upload: String,
  custodian_clg_upload: String,
  professional_address: String,
  qualification_description: String,
  bds_university_address: String,
  bds_qualification_year: {
    type: String,
    match: [/^(0[1-9]|1[0-2])\/\d{4}$/, 'BDS Qualification Year must be in MM/YYYY format']
  },
  bds_clg_address: String,
  bds_degree_upload: String,
  study_upload: String,
  bds_intern_upload: String,
  pr_certificate_upload: String,
  bds_affidavit_upload: String,
  mds_university_address: String,
  mds_qualification_year: {
    type: String,
    match: [/^(0[1-9]|1[0-2])\/\d{4}$/, 'MDS Qualification Year must be in MM/YYYY format']
  },
  mds_clg_address: String,
  mds_degree_upload: String,
  mds_bonafide_marks_upload: String,
  curr_tdc_reg_certificate_upload: String,
  transfer_noc_upload: String,
  noc_dci_upload: String,
  mds_affidavit_upload: String,
  pg_specialist: { type: String, enum: pgSpecialistEnum },
  nid_qualification_des: String,
  dci_university_address: String,
  dci_qualification_year: String,
  dci_clg_address: String,
  dci_degree_upload: String,
  dci_bonafide_upload: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for full name
userSchema.virtual('full_name').get(function() {
  return `${this.f_name} ${this.m_name || ''} ${this.l_name}`.trim();
});

const User = mongoose.model('User', userSchema);
export default User;
