import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function AdminPanel({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Backend state
  const [users, setUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    weekly: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
    reportsCount: 0
  });
  const [aiStatus, setAiStatus] = useState({ isRunning: false, pid: null });

  // Page titles
  const pageTitles = {
    dashboard: 'Dashboard Overview',
    'add-users': 'Add Users',
    'edit-users': 'Edit Users',
    'take-attendance': 'Take Attendance',
    attendance: 'Attendance Analytics',
    reports: 'Report Generation'
  };

  // Load initial data
  const loadData = async () => {
    try {
      const [usersRes, attRes, statsRes, aiRes] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getAttendance().catch(() => ({ records: [] })),
        api.getStats().catch(() => ({ stats: null })),
        api.getAiStatus().catch(() => ({ isRunning: false }))
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (attRes.records) setAttendanceRecords(attRes.records);
      if (statsRes.stats) setStats(statsRes.stats);
      if (aiRes) setAiStatus(aiRes);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  // ---------------- Add Users State & Camera ----------------
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    department: '',
    rollNo: ''
  });
  const [studentPhoto, setStudentPhoto] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMsg, setCameraMsg] = useState('No picture captured yet.');
  const [addUserMsg, setAddUserMsg] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCameraMsg('Camera ready. Position student and take a picture.');
    } catch (err) {
      setCameraMsg('Could not access camera. Please allow permission.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setStudentPhoto(dataUrl);
    setCameraMsg('Picture captured! Will be saved to dataset for AI face recognition.');
    stopCamera();
  };

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStudentPhoto(event.target.result);
      setCameraMsg('Photo loaded from computer. Ready to register.');
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setStudentPhoto('');
    setCameraMsg('No picture captured yet. Open camera or upload a photo.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setAddUserMsg('Adding user...');
    try {
      const res = await api.addUser({
        ...addUserForm,
        studentPhoto
      });
      if (res.success) {
        setAddUserMsg(`✓ ${addUserForm.name} added successfully! Photo registered to AI dataset.`);
        setAddUserForm({ name: '', email: '', department: '', rollNo: '' });
        setStudentPhoto('');
        loadData();
      } else {
        setAddUserMsg(`Error: ${res.message}`);
      }
    } catch (err) {
      setAddUserMsg('Failed to add user to server.');
    }
  };

  // ---------------- Edit Users State ----------------
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (u) => {
    const newName = prompt('Edit student name:', u.name);
    if (newName && newName.trim() && newName.trim() !== u.name) {
      api.updateUser(u.id, { name: newName.trim() }).then(() => loadData());
    }
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      api.deleteUser(id).then(() => loadData());
    }
  };

  // ---------------- Take Attendance & AI Recognition ----------------
  const [attStudent, setAttStudent] = useState('');
  const [attRoll, setAttRoll] = useState('');
  const [attStatus, setAttStatus] = useState('Present');
  const [attTime, setAttTime] = useState('');
  const [attMsg, setAttMsg] = useState('');

  // AI Verification in browser
  const [aiCameraActive, setAiCameraActive] = useState(false);
  const [aiRecognizing, setAiRecognizing] = useState(false);
  const [aiResultMsg, setAiResultMsg] = useState('');
  const attVideoRef = useRef(null);
  const attCanvasRef = useRef(null);
  const attStreamRef = useRef(null);

  const startAiCamera = async () => {
    try {
      stopAiCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      attStreamRef.current = stream;
      if (attVideoRef.current) {
        attVideoRef.current.srcObject = stream;
        attVideoRef.current.play();
      }
      setAiCameraActive(true);
      setAiResultMsg('Camera ready. Look directly at camera to verify face.');
    } catch (err) {
      setAiResultMsg('Could not access camera for AI verification.');
    }
  };

  const stopAiCamera = () => {
    if (attStreamRef.current) {
      attStreamRef.current.getTracks().forEach(t => t.stop());
      attStreamRef.current = null;
    }
    setAiCameraActive(false);
  };

  const captureAndRecognize = async () => {
    if (!attVideoRef.current || !attCanvasRef.current) return;
    const video = attVideoRef.current;
    const canvas = attCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    setAiRecognizing(true);
    setAiResultMsg('Running AI face recognition on CPU...');

    try {
      const res = await api.recognizeFace(dataUrl);
      if (res.success && res.results && res.results.length > 0) {
        const topMatch = res.results[0];
        if (topMatch.matched) {
          setAiResultMsg(`✓ Recognized: ${topMatch.name} (Similarity: ${(topMatch.similarity * 100).toFixed(1)}%). Attendance recorded!`);
          loadData();
        } else {
          setAiResultMsg(`⚠ Face detected, but not recognized in student dataset.`);
        }
      } else {
        setAiResultMsg('No faces detected in the camera frame.');
      }
    } catch (err) {
      setAiResultMsg('AI recognition service error. Ensure Python backend is running.');
    } finally {
      setAiRecognizing(false);
    }
  };

  const attFileInputRef = useRef(null);

  const handleAttFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setAiRecognizing(true);
      setAiResultMsg('Running AI face recognition on uploaded image...');
      try {
        const res = await api.recognizeFace(dataUrl);
        if (res.success && res.results && res.results.length > 0) {
          const topMatch = res.results[0];
          if (topMatch.matched) {
            setAiResultMsg(`✓ Recognized: ${topMatch.name} (Similarity: ${(topMatch.similarity * 100).toFixed(1)}%). Attendance recorded!`);
            loadData();
          } else {
            setAiResultMsg(`⚠ Face detected, but not recognized in student dataset.`);
          }
        } else {
          setAiResultMsg('No faces detected in the uploaded image.');
        }
      } catch (err) {
        setAiResultMsg('AI recognition service error. Ensure Python backend is running.');
      } finally {
        setAiRecognizing(false);
        if (attFileInputRef.current) attFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Launch Desktop Live AI process
  const toggleDesktopLiveAi = async () => {
    if (aiStatus.isRunning) {
      await api.stopLiveAi();
      setAiStatus({ isRunning: false, pid: null });
    } else {
      const res = await api.startLiveAi();
      if (res.success) {
        setAiStatus({ isRunning: true, pid: res.pid });
      }
    }
    loadData();
  };

  const handleManualAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attStudent) {
      setAttMsg('Please select a student.');
      return;
    }

    try {
      const res = await api.markAttendance({
        studentName: attStudent,
        status: attStatus,
        time: attTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      if (res.alreadyMarked) {
        setAttMsg(`ℹ ${attStudent} was already marked for today. Record timestamp updated.`);
      } else {
        setAttMsg(`✓ Attendance recorded for ${attStudent} (${attStatus})`);
      }
      setAttStudent('');
      setAttRoll('');
      loadData();
      setTimeout(() => setAttMsg(''), 4000);
    } catch (err) {
      setAttMsg('Failed to log attendance.');
    }
  };

  // ---------------- Report Generation ----------------
  const [reportType, setReportType] = useState('Daily Attendance');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMsg, setReportMsg] = useState('');

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (startDate > endDate) {
      setReportMsg('Please choose an end date on or after the start date.');
      return;
    }

    try {
      setReportMsg('Generating CSV report...');
      const blob = await api.exportReport({ reportType, startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setReportMsg('✓ Report downloaded successfully!');
    } catch (err) {
      setReportMsg('Failed to export report.');
    }
  };

  // Cleanup cameras when leaving tabs
  useEffect(() => {
    if (currentPage !== 'add-users') stopCamera();
    if (currentPage !== 'take-attendance') stopAiCamera();
  }, [currentPage]);

  return (
    <div className="min-h-screen md:flex bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="w-full bg-slate-900 text-white md:min-h-screen md:w-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-700 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">Admin Panel</h1>
              <p className="text-xs text-slate-400">User Management</p>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto p-4 md:block md:space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '▦' },
              { id: 'add-users', label: 'Add Users', icon: '＋' },
              { id: 'edit-users', label: 'Edit Users', icon: '✎' },
              { id: 'take-attendance', label: 'Take Attendance', icon: '📋' },
              { id: 'attendance', label: 'Attendance Analytics', icon: '▤' },
              { id: 'reports', label: 'Report Generation', icon: '⇩' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition md:w-full ${
                  currentPage === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-700 p-5 text-xs text-slate-400 flex flex-col gap-3">
          <div>
            <p className="font-semibold text-slate-300">Admin Workspace</p>
            <p className="mt-1">Manage users & AI attendance</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full rounded-lg bg-slate-800 py-2 px-3 text-center text-sm font-semibold text-rose-400 hover:bg-slate-700 hover:text-rose-300 transition"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-sm text-slate-500">
              Workspace / <span className="font-medium text-slate-700">{pageTitles[currentPage]}</span>
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {pageTitles[currentPage]}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.email || 'Administrator'}</p>
              <p className="text-xs text-slate-500">System Admin</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              AD
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-8 flex-1">
          {/* ==================== 1. DASHBOARD OVERVIEW ==================== */}
          {currentPage === 'dashboard' && (
            <section className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm sm:p-8">
                <p className="text-sm font-medium text-indigo-100">Welcome back</p>
                <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Manage your workspace with ease.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                  Add and update student records, connect face recognition AI pipeline, and review real-time attendance reports.
                </p>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total Users</p>
                  <p className="mt-3 text-3xl font-bold text-slate-800">{stats.totalUsers}</p>
                  <p className="mt-2 text-xs text-slate-400">Registered students</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Present Today</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.presentToday}</p>
                  <p className="mt-2 text-xs text-emerald-600 font-medium">{stats.attendanceRate}% attendance</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Absent Today</p>
                  <p className="mt-3 text-3xl font-bold text-rose-600">{stats.absentToday}</p>
                  <p className="mt-2 text-xs text-rose-500">Needs attention</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Reports Generated</p>
                  <p className="mt-3 text-3xl font-bold text-indigo-600">{stats.reportsCount}</p>
                  <p className="mt-2 text-xs text-slate-500">Total logs recorded</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-bold">Quick Actions</h3>
                <p className="mt-1 text-sm text-slate-500">Choose a task to get started.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { id: 'add-users', title: 'Add Users', desc: 'Create a new user record.', icon: '＋', color: 'bg-indigo-100 text-indigo-700' },
                    { id: 'edit-users', title: 'Edit Users', desc: 'Find and update user details.', icon: '✎', color: 'bg-amber-100 text-amber-700' },
                    { id: 'take-attendance', title: 'Take Attendance', desc: 'Mark attendance for today.', icon: '📋', color: 'bg-sky-100 text-sky-700' },
                    { id: 'attendance', title: 'Attendance Analytics', desc: 'Review attendance summaries.', icon: '▤', color: 'bg-emerald-100 text-emerald-700' },
                    { id: 'reports', title: 'Report Generation', desc: 'Prepare downloadable reports.', icon: '⇩', color: 'bg-violet-100 text-violet-700' }
                  ].map(action => (
                    <button
                      key={action.id}
                      onClick={() => setCurrentPage(action.id)}
                      className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl ${action.color}`}>
                        {action.icon}
                      </span>
                      <span className="mt-4 block font-semibold text-slate-900">{action.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{action.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="font-bold">Recent Attendance Logs</h3>
                  <span className="text-xs text-slate-400">Synced with attendance_report.csv</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Student Name</th>
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Time</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords.slice(0, 5).map((rec, idx) => (
                        <tr key={idx}>
                          <td className="px-5 py-4 font-medium text-slate-900">{rec.studentName}</td>
                          <td className="px-5 py-4 text-slate-600">{rec.date}</td>
                          <td className="px-5 py-4 text-slate-500">{rec.time}</td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendanceRecords.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-slate-400">
                            No attendance records found yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ==================== 2. ADD USERS ==================== */}
          {currentPage === 'add-users' && (
            <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-bold">Add New User</h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter student information and capture a live photo for the InsightFace AI model.
              </p>

              <form onSubmit={handleAddUserSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Full Name
                  <input
                    required
                    type="text"
                    placeholder="Enter full name"
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Email Address
                  <input
                    required
                    type="email"
                    placeholder="Enter email"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Department
                  <select
                    required
                    value={addUserForm.department}
                    onChange={(e) => setAddUserForm({ ...addUserForm, department: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select department</option>
                    <option>Computer Applications</option>
                    <option>Civil</option>
                    <option>Mechanical</option>
                    <option>ECE</option>
                    <option>CSE</option>
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Roll No.
                  <input
                    required
                    type="text"
                    placeholder="Enter Roll No."
                    value={addUserForm.rollNo}
                    onChange={(e) => setAddUserForm({ ...addUserForm, rollNo: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                {/* Live student photo capture or file upload */}
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block text-sm font-semibold">Student Photo</label>
                  <p className="mt-1 text-sm text-slate-500">
                    Capture via webcam or upload an image file from your computer. The photo will be saved to Cloudinary and registered into the AI dataset.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      {cameraActive ? (
                        <video ref={videoRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
                      ) : studentPhoto ? (
                        <img src={studentPhoto} alt="Captured student preview" className="aspect-video w-full rounded-lg border border-slate-200 bg-white object-contain" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                          Photo preview will appear here
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="flex flex-col items-start justify-center gap-3">
                      {!cameraActive && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
                          >
                            📷 Open Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            📁 Upload from PC
                          </button>
                        </div>
                      )}
                      {cameraActive && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            Take Picture
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {studentPhoto && !cameraActive && (
                        <button
                          type="button"
                          onClick={retakePhoto}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition"
                        >
                          Change / Remove Photo
                        </button>
                      )}
                      <p className="text-sm text-slate-600">{cameraMsg}</p>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col items-start gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Add User
                  </button>
                  {addUserMsg && (
                    <p className="text-sm font-medium text-emerald-700">{addUserMsg}</p>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* ==================== 3. EDIT USERS ==================== */}
          {currentPage === 'edit-users' && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold">User Directory</h3>
                  <p className="mt-1 text-sm text-slate-500">Search and edit student records synchronized with the dataset.</p>
                </div>
                <input
                  type="search"
                  placeholder="Search name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:max-w-xs"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Photo</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">Roll No</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          {u.photoUrl && u.photoUrl.startsWith('http') ? (
                            <img src={u.photoUrl} alt={u.name} className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900">{u.name}</td>
                        <td className="px-5 py-4 text-slate-600">{u.email}</td>
                        <td className="px-5 py-4 text-slate-600">{u.department}</td>
                        <td className="px-5 py-4 text-slate-600">{u.rollNo || '—'}</td>
                        <td className="px-5 py-4 flex gap-2">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="rounded-md border border-slate-300 px-3 py-1 font-medium hover:bg-slate-100 text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u.id)}
                            className="rounded-md border border-rose-200 px-3 py-1 font-medium text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================== 4. TAKE ATTENDANCE ==================== */}
          {currentPage === 'take-attendance' && (
            <section className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
                <div>
                  <h3 className="text-lg font-bold">Take Attendance</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Verify face via camera or uploaded image to record attendance using the AI pipeline.
                  </p>
                </div>
                <div className="text-sm font-semibold text-indigo-600">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* AI Webcam Recognition Pipeline */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
                <div className="mb-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    AI Face Recognition (Powered by ai_recognize.py)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Compares 512-dim facial embeddings with the student dataset on CPU and logs attendance automatically.
                  </p>
                </div>

                {/* Browser camera AI verification */}
                <div className="grid gap-4 md:grid-cols-2 mt-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    {aiCameraActive ? (
                      <video ref={attVideoRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                        Camera inactive
                      </div>
                    )}
                    <canvas ref={attCanvasRef} className="hidden" />
                  </div>

                  <div className="flex flex-col justify-center items-start gap-3">
                    <input
                      type="file"
                      ref={attFileInputRef}
                      onChange={handleAttFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    {!aiCameraActive ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={startAiCamera}
                          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                        >
                          📷 Start Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => attFileInputRef.current?.click()}
                          disabled={aiRecognizing}
                          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          📁 Upload Photo to Recognize
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={captureAndRecognize}
                          disabled={aiRecognizing}
                          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {aiRecognizing ? 'Recognizing...' : 'Recognize Face via AI'}
                        </button>
                        <button
                          type="button"
                          onClick={stopAiCamera}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                        >
                          Close
                        </button>
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-700">{aiResultMsg || 'Click Start Verification Camera to test face recognition.'}</p>
                  </div>
                </div>
              </div>

              {/* Manual Entry Fallback */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Manual Attendance Entry</h4>
                <form onSubmit={handleManualAttendanceSubmit} className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select Student</label>
                    <select
                      value={attStudent}
                      onChange={(e) => {
                        setAttStudent(e.target.value);
                        const found = users.find(u => u.name === e.target.value);
                        if (found) setAttRoll(found.rollNo || '');
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
                      required
                    >
                      <option value="">-- Choose student --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={attStatus}
                      onChange={(e) => setAttStatus(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
                    <input
                      type="time"
                      value={attTime}
                      onChange={(e) => setAttTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-3 mt-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Submit Record
                    </button>
                    {attMsg && <span className="text-sm font-medium text-emerald-700">{attMsg}</span>}
                  </div>
                </form>
              </div>

              {/* Attendance Log Table */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Today's Recorded Attendance</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date().toISOString().slice(0, 10)} (Only 1 record per student per day)
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Student</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords
                        .filter(rec => {
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          return rec.date === todayStr;
                        })
                        .map((rec, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 font-medium text-slate-900 capitalize">
                            {rec.studentName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{rec.date}</td>
                          <td className="px-4 py-3 text-slate-500">{rec.time}</td>
                        </tr>
                      ))}
                      {attendanceRecords.filter(rec => {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        return rec.date === todayStr;
                      }).length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-slate-400">
                            No attendance recorded for today yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ==================== 5. ATTENDANCE ANALYTICS ==================== */}
          {currentPage === 'attendance' && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium">Attendance Rate</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.attendanceRate}%</p>
                  <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, stats.attendanceRate)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium">Present</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.presentToday}</p>
                  <p className="mt-2 text-xs text-slate-500">Count for today</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium">Absent</p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">{stats.absentToday}</p>
                  <p className="mt-2 text-xs text-slate-500">Count for today</p>
                </div>
              </div>

              {/* Weekly bar chart */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="font-bold">Weekly Attendance</h3>
                  <p className="mt-1 text-sm text-slate-500">Recorded attendance count across weekdays.</p>
                </div>

                <div className="mt-8 flex h-64 items-end justify-around gap-3 border-b border-l border-slate-200 px-3 pb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const count = stats.weekly[day] || 0;
                    const maxVal = Math.max(...Object.values(stats.weekly), 5);
                    const heightPct = Math.round((count / maxVal) * 85) + 10;
                    return (
                      <div key={day} className="flex h-full w-12 flex-col justify-end items-center group">
                        <span className="text-[11px] font-bold text-indigo-700 mb-1 opacity-0 group-hover:opacity-100 transition">
                          {count}
                        </span>
                        <div
                          className="w-full rounded-t-md bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-300"
                          style={{ height: `${heightPct}%` }}
                        ></div>
                        <span className="mt-2 text-center text-xs font-semibold text-slate-600">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ==================== 6. REPORT GENERATION ==================== */}
          {currentPage === 'reports' && (
            <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-bold">Generate a Report</h3>
              <p className="mt-1 text-sm text-slate-500">Choose a report type and date range to export.</p>

              <form onSubmit={handleGenerateReport} className="mt-6 space-y-5">
                <label className="block text-sm font-medium">
                  Report Type
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option>Daily Attendance</option>
                    <option>User Directory</option>
                    <option>Monthly Attendance Summary</option>
                  </select>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Start Date
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    End Date
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Generate CSV Report
                  </button>
                  {reportMsg && <p className="text-sm font-medium text-slate-700">{reportMsg}</p>}
                </div>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

