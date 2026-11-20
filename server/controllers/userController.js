const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { DATASET_DIR, PYTHON_PATH, ROOT_DIR } = require('../config/paths');
const { getUsers, saveUser, updateUserRecord, deleteUserRecord } = require('../services/dataService');
const cloudinaryService = require('../services/cloudinaryService');

const EXTRACT_EMBEDDING_SCRIPT = path.join(ROOT_DIR, 'extract_embedding.py');

// Helper to extract 512-dim face embedding via InsightFace on CPU
function extractEmbedding(imagePath) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(PYTHON_PATH, [EXTRACT_EMBEDDING_SCRIPT, imagePath]);
      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(stdout.trim());
            if (data.success && data.embedding) {
              return resolve(data.embedding);
            }
          } catch (e) {}
        }
        resolve(null);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

const getAllUsers = async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, department, rollNo, studentPhoto } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    let photoUrl = '';
    let embedding = null;

    if (studentPhoto) {
      // 1. Upload to Cloudinary & cache in dataset/
      const uploadRes = await cloudinaryService.uploadStudentPhoto(studentPhoto, name);
      photoUrl = uploadRes.photoUrl;

      // 2. Extract 512-dim embedding vector using InsightFace on CPU
      const localFilePath = path.join(DATASET_DIR, uploadRes.localFile);
      if (fs.existsSync(localFilePath)) {
        embedding = await extractEmbedding(localFilePath);
      }
    }

    const userData = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
      department: department || 'General',
      rollNo: rollNo || '',
      photoUrl,
      embedding
    };

    const savedUser = await saveUser(userData);

    res.json({
      success: true,
      message: 'Student registered successfully with AI embedding',
      user: savedUser
    });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, department, rollNo } = req.body;

    const updated = await updateUserRecord(id, { name, email, department, rollNo });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully', user: updated });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteUserRecord(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
