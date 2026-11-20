const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PYTHON_PATH, DATASET_DIR } = require('./config/paths');
const { initDB, getStatus: getDbStatus } = require('./config/db');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');

// Route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Health & Status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: getDbStatus(),
    aiRuntime: PYTHON_PATH
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ai', aiRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server and initialize Database
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`AI Python Runtime: ${PYTHON_PATH}`);
  console.log(`Dataset Directory: ${DATASET_DIR}`);
  await initDB();
});

module.exports = app;
