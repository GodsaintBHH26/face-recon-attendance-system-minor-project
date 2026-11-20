const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { DATASET_DIR } = require('../config/paths');
require('dotenv').config();

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✓ [Cloudinary] Configured for cloud photo storage');
} else {
  console.log('! [Cloudinary] Credentials not set in .env. Using local storage (dataset/).');
}

/**
 * Upload student photo to Cloudinary and also cache locally in dataset/
 */
async function uploadStudentPhoto(base64DataUrl, studentName) {
  const safeName = studentName.trim().toLowerCase().replace(/\s+/g, '_');
  const localFileName = `${safeName}.jpg`;
  const localFilePath = path.join(DATASET_DIR, localFileName);

  // 1. Always save a copy in local dataset/ for offline/fast InsightFace access
  const rawBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(localFilePath, rawBase64, 'base64');

  // 2. Upload to Cloudinary if credentials are set
  if (isCloudinaryConfigured) {
    try {
      const folderName = process.env.CLOUDINARY_FOLDER || 'face_attendance_system';
      const result = await cloudinary.uploader.upload(base64DataUrl, {
        folder: folderName,
        public_id: safeName,
        overwrite: true,
        resource_type: 'image'
      });
      return {
        photoUrl: result.secure_url,
        localFile: localFileName,
        publicId: result.public_id,
        storage: 'cloudinary'
      };
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      // Fallback to local file if upload fails
      return {
        photoUrl: `/dataset/${localFileName}`,
        localFile: localFileName,
        storage: 'local'
      };
    }
  }

  // Fallback to local file
  return {
    photoUrl: `/dataset/${localFileName}`,
    localFile: localFileName,
    storage: 'local'
  };
}

module.exports = {
  isConfigured: isCloudinaryConfigured,
  uploadStudentPhoto
};

