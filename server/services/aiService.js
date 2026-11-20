const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT_DIR, PYTHON_PATH, AI_RECOGNIZE_SCRIPT, AI_SYSTEM_SCRIPT } = require('../config/paths');

let liveAiProcess = null;

function recognizeFace(base64Image) {
  return new Promise((resolve, reject) => {
    const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
    const tempFilePath = path.join(ROOT_DIR, tempFileName);

    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tempFilePath, base64Data, 'base64');

      const pythonProc = spawn(PYTHON_PATH, [AI_RECOGNIZE_SCRIPT, tempFilePath]);

      let stdoutData = '';
      let stderrData = '';

      pythonProc.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProc.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProc.on('close', (code) => {
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }

        if (code !== 0) {
          return reject(new Error(stderrData || `Process exited with code ${code}`));
        }

        try {
          const jsonOutput = JSON.parse(stdoutData.trim());
          resolve(jsonOutput);
        } catch (parseErr) {
          reject(new Error(`Failed to parse AI output: ${stdoutData}`));
        }
      });
    } catch (err) {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
      reject(err);
    }
  });
}

function startLiveAi() {
  if (liveAiProcess && !liveAiProcess.killed) {
    return { success: true, message: 'AI Attendance process already running', pid: liveAiProcess.pid };
  }

  liveAiProcess = spawn(PYTHON_PATH, [AI_SYSTEM_SCRIPT], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    detached: true
  });

  liveAiProcess.unref();

  return {
    success: true,
    message: 'Live AI Attendance system started successfully',
    pid: liveAiProcess.pid
  };
}

function stopLiveAi() {
  if (!liveAiProcess || liveAiProcess.killed) {
    return { success: true, message: 'AI Attendance process is not running' };
  }

  try {
    process.kill(liveAiProcess.pid);
    liveAiProcess = null;
    return { success: true, message: 'Live AI Attendance system stopped' };
  } catch (err) {
    liveAiProcess = null;
    return { success: true, message: 'Process terminated' };
  }
}

function getAiStatus() {
  const isRunning = Boolean(liveAiProcess && !liveAiProcess.killed);
  return {
    isRunning,
    pid: isRunning ? liveAiProcess.pid : null
  };
}

module.exports = {
  recognizeFace,
  startLiveAi,
  stopLiveAi,
  getAiStatus
};

