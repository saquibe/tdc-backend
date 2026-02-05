// src/utils/uploadToS3.js - UPDATED WORKING VERSION
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development' && 
                         process.env.USE_LOCAL_STORAGE === 'true';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Save file locally
 */
const saveFileLocally = (buffer, originalName, folder) => {
  try {
    const folderPath = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${uuidv4()}-${safeName}`;
    const filePath = path.join(folderPath, filename);
    
    fs.writeFileSync(filePath, buffer);
    
    const url = `/uploads/${folder}/${filename}`;
    console.log(`📁 File saved locally: ${url}`);
    
    return url;
  } catch (error) {
    console.error("Local save error:", error);
    throw error;
  }
};

/**
 * Upload to S3 with proper error handling
 */
const uploadToS3 = async (buffer, originalName, folder) => {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${uuidv4()}-${safeName}`;
  
  console.log(`📤 Uploading to S3: ${key} (${buffer.length} bytes)`);

  try {
    // Initialize S3 client
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "ap-southeast-1", // Use your region
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Add retry configuration
      maxAttempts: 3,
    });

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentLength: buffer.length,
      // Add ACL if needed
      // ACL: 'private',
    });

    await s3.send(command);
    
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log(`✅ File uploaded to S3: ${url}`);
    
    return url;
    
  } catch (error) {
    console.error("❌ S3 upload failed:", error.message);
    throw error; // Re-throw to handle in calling function
  }
};

/**
 * Main upload function
 */
export const uploadBufferToS3 = async (
  buffer,
  originalName,
  folder,
  mimeType = "application/pdf"
) => {
  console.log(`🚀 Starting upload for: ${originalName}`);
  
  // Check if we should use local storage
  if (USE_LOCAL_STORAGE) {
    console.log("🔧 Using local storage (development mode)");
    try {
      const localUrl = saveFileLocally(buffer, originalName, folder);
      return `http://localhost:${process.env.PORT || 5000}${localUrl}`;
    } catch (error) {
      console.error("Local storage failed, trying S3...");
      // Continue to try S3
    }
  }
  
  // Try S3 upload
  try {
    return await uploadToS3(buffer, originalName, folder);
  } catch (s3Error) {
    console.error("❌ S3 upload failed, falling back to local storage");
    
    // Fallback to local storage
    if (process.env.NODE_ENV === 'development') {
      const localUrl = saveFileLocally(buffer, originalName, folder);
      return `http://localhost:${process.env.PORT || 5000}${localUrl}`;
    }
    
    // In production, re-throw the error
    throw new Error(`File upload failed: ${s3Error.message}`);
  }
};