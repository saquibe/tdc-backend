import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import GSC from "../models/GSC.js";
import { uploadBufferToS3 } from "../utils/uploadToS3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Helper: Generate Application Number =====
const generateApplicationNumber = async () => {
  const lastGSC = await GSC.findOne({}).sort({ createdAt: -1 });
  const lastNumber = lastGSC
    ? parseInt(lastGSC.applicationNo.split("-")[1])
    : 0;

  return `GSC-${(lastNumber + 1).toString().padStart(3, "0")}`;
};

// ===== Helper: Upload Files to AWS S3 =====
const handleFileUpload = async (req) => {
  const name =
    req.user.full_name ||
    `${req.user.f_name || ""} ${req.user.m_name || ""} ${req.user.l_name || ""}`;

  const safeName = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

  const savedFiles = {};

  for (const [fieldName, file] of Object.entries(req.fileBufferMap)) {
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
// ===== CREATE NEW GSC APPLICATION =====
// ==================================================
export const applyGSC = async (req, res) => {
  try {
    const { postal_address } = req.cleanedFormData;
    const userId = req.user._id;

    const requiredFiles = [
      "tdc_reg_certificate_upload",
      "testimonial_d1_upload",
      "testimonial_d2_upload",
      "aadhaar_upload",
      "tdc_reg_d1_upload",
      "tdc_reg_d2_upload",
    ];

    for (const field of requiredFiles) {
      if (!req.fileBufferMap[field]) {
        return res
          .status(400)
          .json({ error: `Missing required file: ${field}` });
      }
    }

    if (!postal_address) {
      return res.status(400).json({ error: "Postal address is required" });
    }

    const savedFiles = await handleFileUpload(req);
    const applicationNo = await generateApplicationNumber();

    const userName =
      req.user.full_name ||
      `${req.user.f_name || ""} ${req.user.m_name || ""} ${req.user.l_name || ""}`.trim();

    const gsc = new GSC({
      user_id: userId,
      name: userName,
      postal_address,
      applicationNo,
      status: "Pending",
      ...savedFiles,
    });

    await gsc.save();

    const response = gsc.toObject();
    response.applicationDate = gsc.createdAt;

    res.status(201).json({
      success: true,
      message: "GSC submitted successfully",
      data: response,
    });
  } catch (error) {
    console.error("GSC Apply Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================================================
// ===== UPDATE EXISTING GSC APPLICATION =====
// ==================================================
export const updateGSC = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const { postal_address } = req.cleanedFormData;
    const userId = req.user._id;

    const existingGsc = await GSC.findOne({ user_id: userId, applicationNo });

    if (!existingGsc) {
      return res
        .status(404)
        .json({ success: false, error: "Application not found" });
    }

    const savedFiles = await handleFileUpload(req);

    const updateData = {
      postal_address: postal_address || existingGsc.postal_address,
      name:
        req.user.full_name ||
        `${req.user.f_name || ""} ${req.user.m_name || ""} ${req.user.l_name || ""}`.trim(),
      status: "Pending",

      tdc_reg_certificate_upload:
        savedFiles.tdc_reg_certificate_upload ||
        existingGsc.tdc_reg_certificate_upload,

      testimonial_d1_upload:
        savedFiles.testimonial_d1_upload ||
        existingGsc.testimonial_d1_upload,

      testimonial_d2_upload:
        savedFiles.testimonial_d2_upload ||
        existingGsc.testimonial_d2_upload,

      aadhaar_upload:
        savedFiles.aadhaar_upload || existingGsc.aadhaar_upload,

      tdc_reg_d1_upload:
        savedFiles.tdc_reg_d1_upload || existingGsc.tdc_reg_d1_upload,

      tdc_reg_d2_upload:
        savedFiles.tdc_reg_d2_upload || existingGsc.tdc_reg_d2_upload,
    };

    const updatedGsc = await GSC.findOneAndUpdate(
      { user_id: userId, applicationNo },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    const response = updatedGsc.toObject();
    response.applicationDate =
      updatedGsc.updatedAt > updatedGsc.createdAt
        ? updatedGsc.updatedAt
        : updatedGsc.createdAt;

    res.status(200).json({
      success: true,
      message: "GSC updated successfully",
      data: response,
    });
  } catch (error) {
    console.error("GSC Update Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================================================
// ===== GET GSC APPLICATIONS =====
// ==================================================
export const getGSC = async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await GSC.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    const formatted = applications.map((app) => {
      const obj = app.toObject();
      obj.applicationDate =
        app.updatedAt > app.createdAt ? app.updatedAt : app.createdAt;
      return obj;
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Fetch GSC Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
