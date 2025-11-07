import mongoose from 'mongoose';

const nocSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // --- ADDED FIELDS FOR APPLICATION TRACKING ---
    applicationNo: {
        type: String,
        required: true,
        unique: true
    },
    
    name: { // Store the user's name for easy display
        type: String,
        required: true
    },
    
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
        required: true
    },
    // --- END OF ADDED FIELDS ---

    dental_council_name: {
        type: String,
        required: [true, 'Transferee Dental Council name is required']
    },

    tdc_reg_certificate_upload: {
        type: String,
        required: [true, 'TDC registration certificate is required']
    },

    aadhaar_upload: {
        type: String,
        required: [true, 'Aadhaar photocopy is required']
    },

    postal_address: {
        type: String,
        required: [true, 'Postal address is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual property to compute the date of the application for the frontend table
nocSchema.virtual('applicationDate').get(function() {
    // Return the latest date (updatedAt if it exists and is newer, otherwise createdAt)
    return this.updatedAt > this.createdAt ? this.updatedAt : this.createdAt;
});

const NOC = mongoose.model('NOC', nocSchema);
export default NOC;
