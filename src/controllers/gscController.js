import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import GSC from '../models/GSC.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to generate a sequential application number
const generateApplicationNumber = async () => {
    const lastGSC = await GSC.findOne({}).sort({ createdAt: -1 });
    const lastNumber = lastGSC ? parseInt(lastGSC.applicationNo.split('-')[1]) : 0;
    return `GSC-${(lastNumber + 1).toString().padStart(3, '0')}`;
};

// Common file upload logic
const handleFileUpload = async (req) => {
    const name = req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`;
    const safeName = name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    
    const savedFiles = {};
    for (const [fieldName, file] of Object.entries(req.fileBufferMap)) {
        const timestamp = Date.now();
        const filename = `${timestamp}-${fieldName}.pdf`;
        const cloudinaryUrl = await uploadBufferToCloudinary(file.buffer, filename, safeName);
        savedFiles[fieldName] = cloudinaryUrl;
    }
    return savedFiles;
};

// ====== CREATE NEW GSC APPLICATION ======
export const applyGSC = async (req, res) => {
    try {
        const { postal_address } = req.cleanedFormData;
        const userId = req.user._id;

        const requiredFields = [
            'tdc_reg_certificate_upload', 'testimonial_d1_upload', 'testimonial_d2_upload',
            'aadhaar_upload', 'tdc_reg_d1_upload', 'tdc_reg_d2_upload'
        ];
        for (const field of requiredFields) {
            if (!req.fileBufferMap[field]) {
                return res.status(400).json({ error: `Missing required file: ${field}` });
            }
        }
        if (!postal_address) {
            return res.status(400).json({ error: 'Postal address is required' });
        }
        
        const savedFiles = await handleFileUpload(req);
        const newApplicationNo = await generateApplicationNumber();
        
        let userName;
        if (req.user.full_name) {
             userName = req.user.full_name;
        } else {
             userName = `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim();
        }
        
        const gsc = new GSC({
            user_id: userId,
            postal_address,
            applicationNo: newApplicationNo,
            name: userName,
            status: 'Pending',
            ...savedFiles
        });

        await gsc.save();

        // Convert to object to add applicationDate from timestamps
        const gscObj = gsc.toObject();
        gscObj.applicationDate = gsc.updatedAt && gsc.updatedAt > gsc.createdAt ? gsc.updatedAt : gsc.createdAt;

        res.status(201).json({ success: true, message: 'GSC submitted successfully', data: gscObj });
    } catch (error) {
        console.error('GSC Submission Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ====== UPDATE EXISTING GSC APPLICATION ======
export const updateGSC = async (req, res) => {
  try {
    const { applicationNo } = req.params;
    const userId = req.user._id;

    // Find existing GSC record for this user and applicationNo
    const existingGsc = await GSC.findOne({ user_id: userId, applicationNo });
    if (!existingGsc) {
      return res.status(404).json({ success: false, error: 'Application not found or unauthorized' });
    }

    // Upload only the new files
    const savedFiles = await handleFileUpload(req);

    // Merge file fields: keep old ones if not replaced
    const fileFields = [
      'tdc_reg_certificate_upload',
      'testimonial_d1_upload',
      'testimonial_d2_upload',
      'aadhaar_upload',
      'tdc_reg_d1_upload',
      'tdc_reg_d2_upload'
    ];

    const finalFiles = {};
    fileFields.forEach(field => {
      finalFiles[field] = savedFiles[field] || existingGsc[field];
    });

    // Merge text fields: keep old values unless updated
    const finalFields = {
      postal_address: req.cleanedFormData.postal_address || existingGsc.postal_address
    };

    // Construct user name
    const userName = req.user.full_name
      ? req.user.full_name
      : `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim();

    // Final merged update
    const updateData = {
      ...finalFields,
      ...finalFiles,
      name: userName
      // ⚠️ Don’t reset status unless you want every update to force "Pending"
    };

    // Update the record
    const updatedGsc = await GSC.findOneAndUpdate(
      { user_id: userId, applicationNo },
      updateData,
      { new: true, runValidators: true }
    );

    const updatedGscObj = updatedGsc.toObject();
    updatedGscObj.applicationDate =
      updatedGsc.updatedAt && updatedGsc.updatedAt > updatedGsc.createdAt
        ? updatedGsc.updatedAt
        : updatedGsc.createdAt;

    res.status(200).json({ success: true, message: 'GSC updated successfully', data: updatedGscObj });
  } catch (error) {
    console.error('GSC Update Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ====== GET GSC ======
export const getGSC = async (req, res) => {
    try {
        const userId = req.user._id;
        const applications = await GSC.find({ user_id: userId }).sort({ createdAt: -1 });

        // Add applicationDate to each document before sending
        const applicationsWithDate = applications.map(app => {
            const appObj = app.toObject();
            appObj.applicationDate = app.updatedAt && app.updatedAt > app.createdAt ? app.updatedAt : app.createdAt;
            return appObj;
        });

        res.status(200).json({ success: true, data: applicationsWithDate });
    } catch (error) {
        console.error('Fetch GSC Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
