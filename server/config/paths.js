const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SERVER_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(SERVER_DIR, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const DATASET_DIR = path.join(ROOT_DIR, 'dataset');
const ATTENDANCE_CSV = path.join(ROOT_DIR, 'attendance_report.csv');
const PYTHON_PATH = path.join(ROOT_DIR, '.venv', 'Scripts', 'python.exe');
const AI_RECOGNIZE_SCRIPT = path.join(ROOT_DIR, 'ai_recognize.py');
const AI_SYSTEM_SCRIPT = path.join(ROOT_DIR, 'attendance_system.py');

// Ensure necessary directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATASET_DIR)) fs.mkdirSync(DATASET_DIR, { recursive: true });

// Initialize base data files if missing
if (!fs.existsSync(USERS_FILE)) {
  const initialUsers = [
    { id: '1', name: 'pratyush', email: 'pratyush@example.com', department: 'Computer Applications', rollNo: '101', photo: 'pratyush.jpg' },
    { id: '2', name: 'Kunal Sarkar', email: 'kunal@example.com', department: 'CSE', rollNo: '102', photo: '' },
    { id: '3', name: 'Riya Das', email: 'riya@example.com', department: 'ECE', rollNo: '103', photo: '' }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}

if (!fs.existsSync(ADMINS_FILE)) {
  const defaultAdmins = [
    { email: 'admin@example.com', password: 'admin' }
  ];
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(defaultAdmins, null, 2));
}

if (!fs.existsSync(ATTENDANCE_CSV)) {
  fs.writeFileSync(ATTENDANCE_CSV, 'Student Name,Date,Time,Status\n');
}

module.exports = {
  ROOT_DIR,
  SERVER_DIR,
  DATA_DIR,
  USERS_FILE,
  ADMINS_FILE,
  DATASET_DIR,
  ATTENDANCE_CSV,
  PYTHON_PATH,
  AI_RECOGNIZE_SCRIPT,
  AI_SYSTEM_SCRIPT
};

