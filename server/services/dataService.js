const fs = require('fs');
const path = require('path');
const { USERS_FILE, ADMINS_FILE, DATASET_DIR, ATTENDANCE_CSV } = require('../config/paths');
const db = require('../config/db');

// ================= USERS =================
async function getUsers() {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      const res = await db.query('SELECT id, name, email, department, roll_no as "rollNo", photo_url as "photoUrl", embedding FROM users ORDER BY id ASC');
      return res.rows;
    } catch (err) {
      console.error('Error fetching users from DB:', err.message);
    }
  }

  // Fallback: local JSON file
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const users = JSON.parse(data);

    if (fs.existsSync(DATASET_DIR)) {
      const files = fs.readdirSync(DATASET_DIR);
      files.forEach(f => {
        if (/\.(jpg|jpeg|png)$/i.test(f)) {
          const studentName = path.parse(f).name;
          const exists = users.find(u => u.name.toLowerCase() === studentName.toLowerCase());
          if (!exists) {
            users.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
              name: studentName,
              email: `${studentName.toLowerCase().replace(/\s+/g, '')}@example.com`,
              department: 'Computer Applications',
              rollNo: (100 + users.length + 1).toString(),
              photoUrl: `/dataset/${f}`,
              photo: f
            });
          }
        }
      });
    }
    return users;
  } catch (err) {
    return [];
  }
}

async function saveUser(user) {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      const res = await db.query(
        `INSERT INTO users (name, email, department, roll_no, photo_url, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           department = EXCLUDED.department,
           roll_no = EXCLUDED.roll_no,
           photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
           embedding = COALESCE(EXCLUDED.embedding, users.embedding)
         RETURNING id, name, email, department, roll_no as "rollNo", photo_url as "photoUrl"`,
        [
          user.name,
          user.email,
          user.department || 'General',
          user.rollNo || '',
          user.photoUrl || '',
          user.embedding ? JSON.stringify(user.embedding) : null
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Error saving user in DB:', err.message);
    }
  }

  // Fallback: local JSON file
  try {
    const users = await getUsers();
    const existingIdx = users.findIndex(u => u.id === user.id || u.email === user.email);
    if (existingIdx !== -1) {
      users[existingIdx] = { ...users[existingIdx], ...user };
    } else {
      users.push(user);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return user;
  } catch (err) {
    return user;
  }
}

async function updateUserRecord(id, fields) {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      const updates = [];
      const values = [];
      let i = 1;

      if (fields.name) { updates.push(`name = $${i++}`); values.push(fields.name); }
      if (fields.email) { updates.push(`email = $${i++}`); values.push(fields.email); }
      if (fields.department) { updates.push(`department = $${i++}`); values.push(fields.department); }
      if (fields.rollNo) { updates.push(`roll_no = $${i++}`); values.push(fields.rollNo); }
      if (fields.photoUrl) { updates.push(`photo_url = $${i++}`); values.push(fields.photoUrl); }

      values.push(id);
      const queryStr = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, name, email, department, roll_no as "rollNo", photo_url as "photoUrl"`;
      const res = await db.query(queryStr, values);
      return res.rows[0];
    } catch (err) {
      console.error('Error updating user in DB:', err.message);
    }
  }

  // Fallback
  const users = await getUsers();
  const idx = users.findIndex(u => String(u.id) === String(id));
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...fields };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return users[idx];
  }
  return null;
}

async function deleteUserRecord(id) {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting user in DB:', err.message);
    }
  }

  // Fallback
  const users = await getUsers();
  const filtered = users.filter(u => String(u.id) !== String(id));
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2));
}

// ================= ADMINS =================
async function getAdmins() {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      const res = await db.query('SELECT * FROM admins');
      return res.rows;
    } catch (err) {
      console.error('Error fetching admins from DB:', err.message);
    }
  }

  try {
    return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

async function saveAdmin(email, password) {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      await db.query('INSERT INTO admins (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING', [email, password]);
    } catch (err) {
      console.error('Error saving admin in DB:', err.message);
    }
  }

  try {
    const admins = await getAdmins();
    if (!admins.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      admins.push({ email, password });
      fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    }
  } catch (err) {}
}

// ================= ATTENDANCE =================
async function getAttendanceRecords() {
  const dbStatus = db.getStatus();
  if (dbStatus.connected) {
    try {
      const res = await db.query(`
        SELECT student_name as "studentName", TO_CHAR(date, 'YYYY-MM-DD') as date, time, status, photo_url as "photoUrl"
        FROM attendance_logs
        ORDER BY id DESC
      `);
      return res.rows;
    } catch (err) {
      console.error('Error fetching attendance from DB:', err.message);
    }
  }

  // Fallback: local CSV
  if (!fs.existsSync(ATTENDANCE_CSV)) return [];
  const content = fs.readFileSync(ATTENDANCE_CSV, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 4) {
      records.push({
        studentName: parts[0].replace(/^"|"$/g, '').trim(),
        date: parts[1].replace(/^"|"$/g, '').trim(),
        time: parts[2].replace(/^"|"$/g, '').trim(),
        status: parts[3].replace(/^"|"$/g, '').trim()
      });
    }
  }
  return records.reverse();
}

async function appendAttendanceRecord(studentName, date, time, status = 'Present', photoUrl = null) {
  const normalizedName = studentName.replace(/_/g, ' ').replace(/^"|"$/g, '').trim();
  const dbStatus = db.getStatus();

  // 1. PostgreSQL deduplication check
  if (dbStatus.connected) {
    try {
      const existing = await db.query(
        'SELECT id FROM attendance_logs WHERE LOWER(TRIM(REPLACE(student_name, \'_\', \' \'))) = LOWER($1) AND date = $2',
        [normalizedName, date]
      );

      if (existing.rows.length > 0) {
        // Update the existing record instead of inserting a duplicate
        await db.query(
          'UPDATE attendance_logs SET time = $1, status = $2, photo_url = COALESCE($3, photo_url) WHERE id = $4',
          [time, status, photoUrl, existing.rows[0].id]
        );
        return { isNew: false, studentName: normalizedName, date, time, status };
      }

      await db.query(
        'INSERT INTO attendance_logs (student_name, date, time, status, photo_url) VALUES ($1, $2, $3, $4, $5)',
        [normalizedName, date, time, status, photoUrl]
      );
    } catch (err) {
      console.error('Error inserting attendance into DB:', err.message);
    }
  }

  // 2. CSV file deduplication
  try {
    let lines = [];
    if (fs.existsSync(ATTENDANCE_CSV)) {
      lines = fs.readFileSync(ATTENDANCE_CSV, 'utf8').trim().split(/\r?\n/);
    }
    if (lines.length === 0 || !lines[0].startsWith('Student Name')) {
      lines = ['Student Name,Date,Time,Status'];
    }

    let foundIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const rowName = parts[0].replace(/_/g, ' ').replace(/^"|"$/g, '').trim();
        const rowDate = parts[1].replace(/^"|"$/g, '').trim();
        if (rowName.toLowerCase() === normalizedName.toLowerCase() && rowDate === date) {
          foundIdx = i;
          break;
        }
      }
    }

    const newLine = `"${normalizedName}","${date}","${time}","${status}"`;
    if (foundIdx !== -1) {
      lines[foundIdx] = newLine; // Update existing entry
    } else {
      lines.push(newLine); // Append new entry
    }

    fs.writeFileSync(ATTENDANCE_CSV, lines.join('\n') + '\n', 'utf8');
    return { isNew: foundIdx === -1, studentName: normalizedName, date, time, status };
  } catch (err) {
    console.error('Error writing to attendance CSV:', err.message);
  }

  return { isNew: true, studentName: normalizedName, date, time, status };
}

module.exports = {
  getUsers,
  saveUser,
  updateUserRecord,
  deleteUserRecord,
  getAdmins,
  saveAdmin,
  getAttendanceRecords,
  appendAttendanceRecord
};
