import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import NOC from '../models/NOC.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to generate a sequential application number (e.g., NOC-001)
const generateApplicationNumber = async () => {
    const lastNOC = await NOC.findOne({}).sort({ createdAt: -1 });
    const lastNumber = lastNOC ? parseInt(lastNOC.applicationNo.split('-')[1]) : 0;
    return `NOC-${(lastNumber + 1).toString().padStart(3, '0')}`;
};

// Common file upload logic
const handleFileUpload = async (req) => {
    // CRITICAL: Construct name based on available fields (guaranteed by protectRegisteredUser)
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

// ====== CREATE NEW NOC APPLICATION (POST) ======
export const applyNOC = async (req, res) => {
    try {
        const { dental_council_name, postal_address } = req.cleanedFormData;
        const userId = req.user._id;

        const requiredFiles = ['tdc_reg_certificate_upload', 'aadhaar_upload'];
        
        // Validation check for file uploads (enforced by middleware {required: true})
        // We only need to check text fields here, as file checks are done in staticFileUpload
        if (!dental_council_name || !postal_address) {
            return res.status(400).json({ error: 'Missing required text fields.' });
        }

        const savedFiles = await handleFileUpload(req);
        const newApplicationNo = await generateApplicationNumber();
        
        const userName = req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim();
        
        const noc = new NOC({
            user_id: userId,
            dental_council_name,
            postal_address,
            applicationNo: newApplicationNo,
            name: userName,
            status: 'Pending',
            ...savedFiles
        });

        await noc.save();

        const nocObj = noc.toObject();
        // Add applicationDate using the virtual property
        nocObj.applicationDate = noc.applicationDate;
        
        res.status(201).json({ success: true, message: 'NOC submitted successfully', data: nocObj });
    } catch (error) {
        console.error('NOC Submission Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ====== UPDATE EXISTING NOC APPLICATION (PUT) ======
// File: src/controllers/nocController.js (Updated function only)

// File: src/controllers/nocController.js (Updated updateNOC function only)

export const updateNOC = async (req, res) => {
    try {
        const { applicationNo } = req.params;
        const { postal_address, dental_council_name } = req.cleanedFormData;
        const userId = req.user._id;

        // 1. Find existing NOC record
        const existingNoc = await NOC.findOne({ user_id: userId, applicationNo });
        if (!existingNoc) {
            return res.status(404).json({ success: false, error: 'Application not found or unauthorized' });
        }
        
        // **CRITICAL FIX:** We remove the rigid check for text fields here.
        // We now trust the MERGE LOGIC to retain old values if the new ones are empty.
        
        // 2. Upload only the new files (req.fileBufferMap contains only uploaded files)
        const savedFiles = await handleFileUpload(req);
        
        const userName = req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim();
        
        // 3. MERGE LOGIC
        const updateData = {
            // Text fields: If the field is missing/empty in the new request, fall back to the existing value.
            // This allows for true partial updates on text fields.
            postal_address: postal_address || existingNoc.postal_address,
            dental_council_name: dental_council_name || existingNoc.dental_council_name,
            
            // File Fields: Use new URL from upload (savedFiles), or fallback to existing URL
            tdc_reg_certificate_upload: savedFiles.tdc_reg_certificate_upload || existingNoc.tdc_reg_certificate_upload,
            aadhaar_upload: savedFiles.aadhaar_upload || existingNoc.aadhaar_upload,
            
            name: userName,
            status: 'Pending', // Force status back to Pending on resubmission
        };

        // 4. Update the record
        const updatedNoc = await NOC.findOneAndUpdate(
            { user_id: userId, applicationNo },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        const updatedNocObj = updatedNoc.toObject();
        updatedNocObj.applicationDate = updatedNoc.applicationDate;

        res.status(200).json({ success: true, message: 'NOC updated successfully', data: updatedNocObj });
    } catch (error) {
        console.error('NOC Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ====== GET NOC APPLICATIONS ======
export const getNOC = async (req, res) => {
    try {
        const userId = req.user._id;
        const applications = await NOC.find({ user_id: userId }).sort({ createdAt: -1 });

        // Add applicationDate using the virtual property for frontend compatibility
        const applicationsWithDate = applications.map(app => {
            const appObj = app.toObject();
            appObj.applicationDate = app.applicationDate;
            return appObj;
        });

        res.status(200).json({ success: true, data: applicationsWithDate });
    } catch (error) {
        console.error('Fetch NOC Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
