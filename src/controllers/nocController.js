import path from 'path';
import { fileURLToPath } from 'url';
import NOC from '../models/NOC.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sequential NOC Application Number Generator
const generateApplicationNumber = async () => {
  const lastNOC = await NOC.findOne({}).sort({ createdAt: -1 });
  const lastNumber = lastNOC ? parseInt(lastNOC.applicationNo.split('-')[1]) : 0;
  return `NOC-${(lastNumber + 1).toString().padStart(3, '0')}`;
};

// Common File Upload Utility
const handleFileUpload = async (req) => {
  const name = req.user.name_in_full || req.user.full_name || 'User';
  const safeName = name.trim().replace(/\s+/g, '_');
  const savedFiles = {};

  for (const [fieldName, file] of Object.entries(req.fileBufferMap || {})) {
    const filename = `${Date.now()}-${fieldName}.pdf`;
    const cloudUrl = await uploadBufferToCloudinary(file.buffer, filename, safeName);
    savedFiles[fieldName] = cloudUrl;
  }

  return savedFiles;
};

// ================= APPLY NOC =================
export const applyNOC = async (req, res) => {
  try {
    const basicUser = req.user;

    if (!basicUser?.membership_id) {
      return res.status(403).json({
        success: false,
        error: 'Only users with a valid membership ID can apply for NOC.',
      });
    }

    const { dental_council_name, postal_address } = req.cleanedFormData;
    if (!dental_council_name || !postal_address) {
      return res.status(400).json({ success: false, error: 'Missing required text fields.' });
    }

    const savedFiles = await handleFileUpload(req);
    const newApplicationNo = await generateApplicationNumber();

    const newNOC = new NOC({
      basic_user_id: basicUser._id,
      membership_id: basicUser.membership_id,
      name: basicUser.name_in_full || basicUser.full_name,
      dental_council_name,
      postal_address,
      applicationNo: newApplicationNo,
      status: 'Pending',
      ...savedFiles,
    });

    await newNOC.save();

    res.status(201).json({
      success: true,
      message: 'NOC application submitted successfully.',
      data: { ...newNOC.toObject(), applicationDate: newNOC.applicationDate },
    });
  } catch (error) {
    console.error('NOC Apply Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= UPDATE NOC (now via POST) =================
export const updateNOC = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const basicUser = req.user;

    console.log("🟢 NOC Update Request Received:", applicationNo);

    // 1️⃣ Find existing record
    const existingNoc = await NOC.findOne({
      basic_user_id: basicUser._id,
      applicationNo,
    });

    if (!existingNoc) {
      return res.status(404).json({
        success: false,
        error: "NOC application not found.",
      });
    }

    // 2️⃣ Handle uploaded files (if any)
    const savedFiles = await handleFileUpload(req);
    const { postal_address, dental_council_name } = req.cleanedFormData || {};

    // 3️⃣ Merge old + new data
    const updatedData = {
      postal_address: postal_address || existingNoc.postal_address,
      dental_council_name:
        dental_council_name || existingNoc.dental_council_name,
      tdc_reg_certificate_upload:
        savedFiles?.tdc_reg_certificate_upload ||
        existingNoc.tdc_reg_certificate_upload,
      aadhaar_upload:
        savedFiles?.aadhaar_upload || existingNoc.aadhaar_upload,
      status: "Pending",
    };

    // 4️⃣ Save update
    const updatedNoc = await NOC.findOneAndUpdate(
      { basic_user_id: basicUser._id, applicationNo },
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    // 5️⃣ Respond
    return res.status(200).json({
      success: true,
      message: "NOC updated successfully.",
      data: {
        ...updatedNoc.toObject(),
        applicationDate: updatedNoc.applicationDate,
      },
    });
  } catch (error) {
    console.error("❌ NOC Update Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// ================= GET ALL NOC APPLICATIONS =================
export const getAllNOC = async (req, res) => {
  try {
    const applications = await NOC.find({ basic_user_id: req.user._id }).sort({ createdAt: -1 });
    const data = applications.map((a) => ({
      ...a.toObject(),
      applicationDate: a.applicationDate,
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Fetch NOC Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= GET NOC BY APPLICATION ID =================
export const getNOCById = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const noc = await NOC.findOne({
      basic_user_id: req.user._id,
      applicationNo,
    });

    if (!noc) {
      return res.status(404).json({ success: false, error: 'NOC not found.' });
    }

    res.status(200).json({
      success: true,
      data: { ...noc.toObject(), applicationDate: noc.applicationDate },
    });
  } catch (error) {
    console.error('Fetch NOC by ID Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
