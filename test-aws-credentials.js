// test-aws-credentials.js
import dotenv from 'dotenv';
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

dotenv.config();

console.log('🔍 AWS Credentials Test');
console.log('=======================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 
  `✅ Set (${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...)` : '❌ Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 
  '✅ Set (masked)' : '❌ Missing');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Not set');
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

console.log('\n🔧 Testing AWS Connection...\n');

async function testAWSCredentials() {
  try {
    // Check if required variables are present
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('❌ AWS credentials are missing in .env file');
      console.log('\n📝 Add these to your .env file:');
      console.log('AWS_ACCESS_KEY_ID=your_access_key_here');
      console.log('AWS_SECRET_ACCESS_KEY=your_secret_key_here');
      console.log('AWS_REGION=your_region_here (e.g., ap-south-1)');
      console.log('AWS_BUCKET_NAME=your_bucket_name_here');
      return;
    }

    // Try to initialize S3 client
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('✅ S3 Client initialized successfully');
    
    // Try to list buckets
    const command = new ListBucketsCommand({});
    const response = await s3.send(command);
    
    console.log('✅ AWS Credentials are valid!');
    console.log(`📦 Number of accessible buckets: ${response.Buckets?.length || 0}`);
    
    if (response.Buckets && response.Buckets.length > 0) {
      console.log('\n📋 Available buckets:');
      response.Buckets.forEach((bucket, index) => {
        console.log(`  ${index + 1}. ${bucket.Name} (Created: ${bucket.CreationDate})`);
      });
    }
    
    // Check if configured bucket exists
    if (process.env.AWS_BUCKET_NAME) {
      const bucketExists = response.Buckets?.some(
        bucket => bucket.Name === process.env.AWS_BUCKET_NAME
      );
      
      if (bucketExists) {
        console.log(`\n✅ Bucket "${process.env.AWS_BUCKET_NAME}" exists and is accessible`);
      } else {
        console.log(`\n⚠️ Bucket "${process.env.AWS_BUCKET_NAME}" not found in your account`);
        console.log('   Make sure:');
        console.log('   1. Bucket name is spelled correctly');
        console.log('   2. Bucket exists in region:', process.env.AWS_REGION);
        console.log('   3. Your IAM user has permissions to access this bucket');
      }
    }
    
  } catch (error) {
    console.error('\n❌ AWS Connection failed:', error.name);
    console.error('   Message:', error.message);
    
    // Common error diagnosis
    if (error.name === 'InvalidClientTokenId') {
      console.log('\n💡 Solution: Your Access Key ID is invalid');
      console.log('   - Go to AWS IAM Console');
      console.log('   - Generate new access keys');
      console.log('   - Update your .env file');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Solution: Your Secret Access Key is invalid');
      console.log('   - Regenerate your AWS credentials');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 Solution: Your IAM user doesn\'t have S3 permissions');
      console.log('   - Add AmazonS3FullAccess policy to your IAM user');
    } else if (error.name === 'CredentialsProviderError') {
      console.log('\n💡 Solution: Credentials format issue');
      console.log('   - Check for trailing spaces in .env file');
      console.log('   - Make sure .env file is in the correct location');
    } else if (error.message.includes('region')) {
      console.log('\n💡 Solution: Region might be incorrect');
      console.log('   - Common regions: us-east-1, us-west-2, ap-south-1, ap-southeast-1');
      console.log('   - Check your S3 bucket region in AWS Console');
    }
    
    console.log('\n🔧 Quick fix for development:');
    console.log('   1. Comment out AWS credentials in .env');
    console.log('   2. Set NODE_ENV=development');
    console.log('   3. System will use local file storage automatically');
  }
}

// Run the test
testAWSCredentials();