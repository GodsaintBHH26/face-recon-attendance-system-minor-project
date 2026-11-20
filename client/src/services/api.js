const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  signup: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  addUser: async (userData) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  updateUser: async (id, userData) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Attendance
  getAttendance: async () => {
    const res = await fetch(`${API_BASE}/attendance`);
    return res.json();
  },

  markAttendance: async (data) => {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getStats: async () => {
    const res = await fetch(`${API_BASE}/attendance/stats`);
    return res.json();
  },

  exportReport: async (filter) => {
    const res = await fetch(`${API_BASE}/attendance/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter)
    });
    return res.blob();
  },

  // AI Pipeline
  recognizeFace: async (imageBase64) => {
    const res = await fetch(`${API_BASE}/ai/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    });
    return res.json();
  },

  startLiveAi: async () => {
    const res = await fetch(`${API_BASE}/ai/start-live`, { method: 'POST' });
    return res.json();
  },

  stopLiveAi: async () => {
    const res = await fetch(`${API_BASE}/ai/stop-live`, { method: 'POST' });
    return res.json();
  },

  getAiStatus: async () => {
    const res = await fetch(`${API_BASE}/ai/status`);
    return res.json();
  }
};

