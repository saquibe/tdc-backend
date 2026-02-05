// test-s3-upload.js
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

console.log('🔍 Testing S3 Upload (matching app logic)');
console.log('========================================\n');

async function testUpload() {
  try {
    // Create test buffer (mimicking a PDF)
    const testBuffer = Buffer.from('Test PDF content for S3 upload');
    
    // Use same parameters as your app
    const folder = 'test-uploads';
    const originalName = 'test-file.pdf';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${uuidv4()}-${safeName}`;
    
    console.log('📋 Upload details:');
    console.log('  Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('  Region:', process.env.AWS_REGION);
    console.log('  Key:', key);
    console.log('  Buffer size:', testBuffer.length, 'bytes');
    
    // Initialize S3 client EXACTLY like in your app
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    console.log('\n✅ S3 Client created');
    
    // Try to upload
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: testBuffer,
      ContentType: 'application/pdf',
      ContentLength: testBuffer.length,
    });
    
    console.log('🚀 Attempting upload...');
    const response = await s3.send(command);
    
    console.log('\n🎉 SUCCESS! File uploaded to S3');
    console.log('Response:', {
      statusCode: response.$metadata.httpStatusCode,
      requestId: response.$metadata.requestId,
      ETag: response.ETag
    });
    
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('📎 File URL:', url);
    
    return { success: true, url };
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    return { success: false, error };
  }
}

testUpload();