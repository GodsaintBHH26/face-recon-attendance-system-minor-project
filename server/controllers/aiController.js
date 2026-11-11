const aiService = require('../services/aiService');
const { appendAttendanceRecord } = require('../services/dataService');

const recognizeFace = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image base64 data required' });
    }

    const result = await aiService.recognizeFace(image);

    // Synchronize recognized matches to Supabase / CSV with daily deduplication
    if (result && result.results && result.results.length > 0) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = now.toTimeString().split(' ')[0];

      for (const item of result.results) {
        if (item.matched && item.name && item.name !== 'Unknown') {
          await appendAttendanceRecord(item.name, dateStr, timeStr, 'Present');
        }
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'AI recognition failed',
      error: err.message
    });
  }
};

const startLive = (req, res, next) => {
  try {
    const result = aiService.startLiveAi();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const stopLive = (req, res, next) => {
  try {
    const result = aiService.stopLiveAi();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getStatus = (req, res, next) => {
  try {
    const status = aiService.getAiStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recognizeFace,
  startLive,
  stopLive,
  getStatus
};

