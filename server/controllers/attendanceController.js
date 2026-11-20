const { getUsers, getAttendanceRecords, appendAttendanceRecord } = require('../services/dataService');

const getAttendance = async (req, res, next) => {
  try {
    const records = await getAttendanceRecords();
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { studentName, status = 'Present', time, photoUrl = null } = req.body;
    if (!studentName) {
      return res.status(400).json({ success: false, message: 'Student name required' });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = time || now.toTimeString().split(' ')[0];

    const result = await appendAttendanceRecord(studentName, dateStr, timeStr, status, photoUrl);

    res.json({
      success: true,
      message: result.isNew ? 'Attendance recorded' : 'Attendance updated (already marked today)',
      alreadyMarked: !result.isNew,
      record: { studentName: result.studentName, date: dateStr, time: timeStr, status, photoUrl }
    });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const users = await getUsers();
    const records = await getAttendanceRecords();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayRecords = records.filter(r => r.date === today);
    const presentNames = new Set(
      todayRecords
        .filter(r => (r.status || '').toLowerCase() === 'present')
        .map(r => (r.studentName || '').toLowerCase())
    );

    const totalUsers = users.length || 1;
    const presentToday = presentNames.size;
    const absentToday = Math.max(0, totalUsers - presentToday);
    const attendanceRate = Math.round((presentToday / totalUsers) * 100);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    records.forEach(r => {
      try {
        const d = new Date(r.date);
        const dayIndex = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
        const dayName = daysOfWeek[dayIndex];
        if ((r.status || '').toLowerCase() === 'present' && dayCounts[dayName] !== undefined) {
          dayCounts[dayName]++;
        }
      } catch (e) {}
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        presentToday,
        absentToday,
        attendanceRate,
        weekly: dayCounts,
        reportsCount: records.length
      }
    });
  } catch (err) {
    next(err);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate } = req.body;
    const records = await getAttendanceRecords();
    const users = await getUsers();

    let csvContent = '';

    if (reportType === 'User Directory') {
      csvContent = 'ID,Name,Email,Department,Roll No,Photo URL\n';
      users.forEach(u => {
        csvContent += `"${u.id}","${u.name}","${u.email}","${u.department}","${u.rollNo || ''}","${u.photoUrl || ''}"\n`;
      });
    } else {
      let filtered = records;
      if (startDate && endDate) {
        filtered = records.filter(r => r.date >= startDate && r.date <= endDate);
      }
      csvContent = 'Student Name,Date,Time,Status\n';
      filtered.forEach(r => {
        csvContent += `"${r.studentName}","${r.date}","${r.time}","${r.status}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  getStats,
  exportReport
};
