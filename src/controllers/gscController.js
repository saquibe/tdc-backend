import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import GSC from '../models/GSC.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

// --- Imports for User/BasicUser are assumed to be present ---
// import User from '../models/User.js'; 
// import BasicUser from '../models/BasicUser.js'; 

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
    // CRITICAL FIX: The name construction logic is handled here for consistency
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
        
        // Construct the name based on the available fields (guaranteed by protectRegisteredUser)
        const userName = req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim();
        
        const gsc = new GSC({
            user_id: userId,
            postal_address,
            applicationNo: newApplicationNo,
            name: userName, 
            status: 'Pending', // New applications start as Pending
            ...savedFiles
        });

        await gsc.save();

        const gscObj = gsc.toObject();
        gscObj.applicationDate = gsc.updatedAt || gsc.createdAt; // Use createdAt for new record

        res.status(201).json({ success: true, message: 'GSC submitted successfully', data: gscObj });
    } catch (error) {
        console.error('GSC Submission Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ====== UPDATE EXISTING GSC APPLICATION ======
// export const updateGSC = async (req, res) => {
//     try {
//         const { applicationNo } = req.params;
//         const { postal_address } = req.cleanedFormData;
//         const userId = req.user._id;

//         // 1. Find existing GSC record for partial update logic
//         const existingGsc = await GSC.findOne({ user_id: userId, applicationNo });
//         if (!existingGsc) {
//             return res.status(404).json({ success: false, error: 'Application not found or unauthorized' });
//         }

//         // 2. Validate essential text fields
//         if (!postal_address) {
//             return res.status(400).json({ error: 'Postal address is required' });
//         }
        
//         // 3. Upload only the new files (req.fileBufferMap only contains newly uploaded files)
//         const savedFiles = await handleFileUpload(req);
        
//         // 4. MERGE LOGIC: Combine old file URLs with newly uploaded URLs
//         const updateData = {
//             // Text fields: Use new value, or fallback to existing value if new value is empty
//             postal_address: req.cleanedFormData.postal_address || existingGsc.postal_address,
//             // User Name: Must be re-calculated from the current User document
//             name: req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim(),
//             status: 'Pending', // Force status back to Pending on resubmission

//             // File Fields: Loop through model fields, use new URL if uploaded, otherwise use old URL
//             tdc_reg_certificate_upload: savedFiles.tdc_reg_certificate_upload || existingGsc.tdc_reg_certificate_upload,
//             testimonial_d1_upload: savedFiles.testimonial_d1_upload || existingGsc.testimonial_d1_upload,
//             testimonial_d2_upload: savedFiles.testimonial_d2_upload || existingGsc.testimonial_d2_upload,
//             aadhaar_upload: savedFiles.aadhaar_upload || existingGsc.aadhaar_upload,
//             tdc_reg_d1_upload: savedFiles.tdc_reg_d1_upload || existingGsc.tdc_reg_d1_upload,
//             tdc_reg_d2_upload: savedFiles.tdc_reg_d2_upload || existingGsc.tdc_reg_d2_upload,
//         };

//         // 5. Update the record
//         const updatedGsc = await GSC.findOneAndUpdate(
//             { user_id: userId, applicationNo },
//             { $set: updateData }, // Use $set to update fields
//             { new: true, runValidators: true }
//         );

//         const updatedGscObj = updatedGsc.toObject();
//         updatedGscObj.applicationDate = updatedGsc.updatedAt || updatedGsc.createdAt;
        
//         res.status(200).json({ success: true, message: 'GSC updated successfully', data: updatedGscObj });
//     } catch (error) {
//         console.error('GSC Update Error:', error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// };

// File: src/controllers/gscController.js (Updated updateGSC function only)

export const updateGSC = async (req, res) => {
    try {
        const { applicationNo } = req.params;
        const { postal_address } = req.cleanedFormData;
        const userId = req.user._id;

        // 1. Find existing GSC record for partial update logic
        const existingGsc = await GSC.findOne({ user_id: userId, applicationNo });
        if (!existingGsc) {
            return res.status(404).json({ success: false, error: 'Application not found or unauthorized' });
        }

        // 2. Upload only the new files (req.fileBufferMap only contains newly uploaded files)
        const savedFiles = await handleFileUpload(req);
        
        // 3. MERGE LOGIC: Combine old file URLs with newly uploaded URLs
        const updateData = {
            // CRITICAL FIX: The check is now dynamic. If postal_address is empty/undefined 
            // in the request, the existingGsc.postal_address value is used.
            postal_address: postal_address || existingGsc.postal_address,
            
            // User Name: Must be re-calculated from the current User document
            name: req.user.full_name || `${req.user.f_name || ''} ${req.user.m_name || ''} ${req.user.l_name || ''}`.trim(),
            status: 'Pending', // Force status back to Pending on resubmission

            // File Fields: Loop through model fields, use new URL if uploaded, otherwise use old URL
            tdc_reg_certificate_upload: savedFiles.tdc_reg_certificate_upload || existingGsc.tdc_reg_certificate_upload,
            testimonial_d1_upload: savedFiles.testimonial_d1_upload || existingGsc.testimonial_d1_upload,
            testimonial_d2_upload: savedFiles.testimonial_d2_upload || existingGsc.testimonial_d2_upload,
            aadhaar_upload: savedFiles.aadhaar_upload || existingGsc.aadhaar_upload,
            tdc_reg_d1_upload: savedFiles.tdc_reg_d1_upload || existingGsc.tdc_reg_d1_upload,
            tdc_reg_d2_upload: savedFiles.tdc_reg_d2_upload || existingGsc.tdc_reg_d2_upload,
        };

        // 4. Update the record
        const updatedGsc = await GSC.findOneAndUpdate(
            { user_id: userId, applicationNo },
            { $set: updateData }, // Use $set to update fields
            { new: true, runValidators: true }
        );

        const updatedGscObj = updatedGsc.toObject();
        updatedGscObj.applicationDate = updatedGsc.updatedAt || updatedGsc.createdAt;
        
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

        // Add applicationDate to each document before sending (CRITICAL for frontend)
        const applicationsWithDate = applications.map(app => {
            const appObj = app.toObject();
            // Assuming your GSC model has a virtual property that computes applicationDate
            appObj.applicationDate = app.updatedAt && app.updatedAt > app.createdAt ? app.updatedAt : app.createdAt;
            return appObj;
        });

        res.status(200).json({ success: true, data: applicationsWithDate });
    } catch (error) {
        console.error('Fetch GSC Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};