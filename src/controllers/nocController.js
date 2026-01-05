import path from "path";
import { fileURLToPath } from "url";
import NOC from "../models/NOC.js";
import { uploadBufferToS3 } from "../utils/uploadToS3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================================================
// ===== Helper: Generate Sequential NOC Number =====
// ==================================================
const generateApplicationNumber = async () => {
  const lastNOC = await NOC.findOne({}).sort({ createdAt: -1 });
  const lastNumber = lastNOC
    ? parseInt(lastNOC.applicationNo.split("-")[1])
    : 0;

  return `NOC-${(lastNumber + 1).toString().padStart(3, "0")}`;
};

// ==================================================
// ===== Helper: Upload Files to AWS S3 =====
// ==================================================
const handleFileUpload = async (req) => {
  const name =
    req.user.name_in_full ||
    req.user.full_name ||
    "User";

  const safeName = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

  const savedFiles = {};

  for (const [fieldName, file] of Object.entries(req.fileBufferMap || {})) {
    const filename = `${Date.now()}-${fieldName}.pdf`;

    const s3Url = await uploadBufferToS3(
      file.buffer,
      filename,
      safeName
    );

    savedFiles[fieldName] = s3Url;
  }

  return savedFiles;
};

// ==================================================
// ================= APPLY NOC ======================
// ==================================================
export const applyNOC = async (req, res) => {
  try {
    const basicUser = req.user;

    if (!basicUser?.membership_id) {
      return res.status(403).json({
        success: false,
        error: "Only users with a valid membership ID can apply for NOC.",
      });
    }

    const { dental_council_name, postal_address } = req.cleanedFormData || {};

    if (!dental_council_name || !postal_address) {
      return res.status(400).json({
        success: false,
        error: "Missing required text fields.",
      });
    }

    const savedFiles = await handleFileUpload(req);
    const applicationNo = await generateApplicationNumber();

    const newNOC = new NOC({
      basic_user_id: basicUser._id,
      membership_id: basicUser.membership_id,
      name: basicUser.name_in_full || basicUser.full_name,
      dental_council_name,
      postal_address,
      applicationNo,
      status: "Pending",
      ...savedFiles,
    });

    await newNOC.save();

    const response = newNOC.toObject();
    response.applicationDate = newNOC.applicationDate;

    res.status(201).json({
      success: true,
      message: "NOC application submitted successfully.",
      data: response,
    });
  } catch (error) {
    console.error("NOC Apply Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ==================================================
// ================= UPDATE NOC =====================
// ==================================================
export const updateNOC = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const basicUser = req.user;

    console.log("🟢 NOC Update Request:", applicationNo);

    // 1️⃣ Find existing application
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

    // 2️⃣ Upload new files (if any)
    const savedFiles = await handleFileUpload(req);
    const { postal_address, dental_council_name } =
      req.cleanedFormData || {};

    // 3️⃣ Merge old + new data
    const updatedData = {
      postal_address: postal_address || existingNoc.postal_address,
      dental_council_name:
        dental_council_name || existingNoc.dental_council_name,

      tdc_reg_certificate_upload:
        savedFiles.tdc_reg_certificate_upload ||
        existingNoc.tdc_reg_certificate_upload,

      aadhaar_upload:
        savedFiles.aadhaar_upload ||
        existingNoc.aadhaar_upload,

      status: "Pending",
    };

    // 4️⃣ Save update
    const updatedNoc = await NOC.findOneAndUpdate(
      { basic_user_id: basicUser._id, applicationNo },
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    const response = updatedNoc.toObject();
    response.applicationDate = updatedNoc.applicationDate;

    return res.status(200).json({
      success: true,
      message: "NOC updated successfully.",
      data: response,
    });
  } catch (error) {
    console.error("❌ NOC Update Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// ==================================================
// ================= GET ALL NOC ====================
// ==================================================
export const getAllNOC = async (req, res) => {
  try {
    const applications = await NOC.find({
      basic_user_id: req.user._id,
    }).sort({ createdAt: -1 });

    const data = applications.map((app) => {
      const obj = app.toObject();
      obj.applicationDate = app.applicationDate;
      return obj;
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Fetch NOC Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ==================================================
// ============ GET NOC BY APPLICATION NO ============
// ==================================================
export const getNOCById = async (req, res) => {
  try {
    const { applicationNo } = req.params;

    const noc = await NOC.findOne({
      basic_user_id: req.user._id,
      applicationNo,
    });

    if (!noc) {
      return res.status(404).json({
        success: false,
        error: "NOC not found.",
      });
    }

    const response = noc.toObject();
    response.applicationDate = noc.applicationDate;

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Fetch NOC By ID Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
