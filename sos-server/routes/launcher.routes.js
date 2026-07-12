const express = require('express');
const router = express.Router();
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// Secure administrative endpoints to local access only
router.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocal = ip === '127.0.0.1' || 
                  ip === '::1' || 
                  ip === '::ffff:127.0.0.1' || 
                  ip === 'localhost';
  if (!isLocal) {
    return res.status(403).json({ error: "Access denied: Administrative launcher actions are restricted to localhost." });
  }
  next();
});

// Global state for background operations
let activeOperation = {
  running: false,
  operation: 'idle', // 'npm-install', 'ollama-pull', 'vite-build', 'start-app'
  exitCode: null,
  logContent: ''
};

const rootDir = path.join(__dirname, '..', '..');
const logsDir = path.join(rootDir, 'logs');
const logFile = path.join(logsDir, 'sos-launcher-web.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function writeToLog(text) {
  activeOperation.logContent += text + '\n';
  fs.appendFileSync(logFile, text + '\n', 'utf8');
}

function runCommand(command, args, opName, cwd = rootDir) {
  if (activeOperation.running) {
    return false;
  }

  activeOperation.running = true;
  activeOperation.operation = opName;
  activeOperation.exitCode = null;
  activeOperation.logContent = '';

  // Clear log file
  fs.writeFileSync(logFile, `=== STARTING ${opName.toUpperCase()} ===\n`, 'utf8');

  writeToLog(`[LAUNCHER] Working Directory: ${cwd}`);
  writeToLog(`[LAUNCHER] Running: ${command} ${args.join(' ')}`);

  const useShell = process.platform === 'win32' && command === 'npm';
  const child = spawn(command, args, { cwd, shell: useShell });

  child.stdout.on('data', (data) => {
    writeToLog(data.toString().trim());
  });

  child.stderr.on('data', (data) => {
    writeToLog(`[ERROR] ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    activeOperation.running = false;
    activeOperation.exitCode = code;
    writeToLog(`=== COMPLETED ${opName.toUpperCase()} WITH CODE ${code} ===`);
  });

  return true;
}

// 1. Get Launcher Status
router.get('/status', (req, res) => {
  res.json(activeOperation);
});

// 2. Tail Logs
router.get('/log-tail', (req, res) => {
  res.json({ logs: activeOperation.logContent });
});

// 3. Diagnostics Route
router.get('/diagnostics', async (req, res) => {
  const checkCmd = (cmd) => {
    return new Promise((resolve) => {
      exec(cmd, (error, stdout) => {
        if (error) resolve({ installed: false, version: null });
        else resolve({ installed: true, version: stdout.trim().split('\n')[0] });
      });
    });
  };

  const nodeVer = process.version;
  const pythonVer = await checkCmd('python --version');
  const gitVer = await checkCmd('git --version');
  const ollamaVer = await checkCmd('ollama --version');

  // Node modules check
  const serverModulesExist = fs.existsSync(path.join(rootDir, 'sos-server', 'node_modules'));
  const appModulesExist = fs.existsSync(path.join(rootDir, 'sos-app', 'node_modules'));
  const packagesInstalled = serverModulesExist && appModulesExist;

  // System Hardware
  const cpuCores = os.cpus().length;
  const systemRam = Math.round(os.totalmem() / (1024 * 1024 * 1024));

  // GPU detection
  exec('nvidia-smi --query-gpu=gpu_name,memory.total --format=csv,noheader,nounits', (gpuErr, stdout) => {
    let gpuList = [];
    if (!gpuErr && stdout) {
      stdout.trim().split('\n').forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const vramGb = Math.round(parseFloat(parts[1].trim()) / 1024);
          gpuList.push({
            name: parts[0].trim(),
            vram: `${vramGb} GB`,
            cuda: true
          });
        }
      });
    }

    // Hardware recommendation tier
    let tier = 'low';
    let ramText = `${systemRam} GB`;
    let cpuText = `${cpuCores} cores`;
    let recommendedLlm = 'llama3.2:1b or qwen2.5:1.5b';
    let recommendedOcr = 'llava:7b (CPU - slow)';

    const hasNvidia = gpuList.length > 0;
    const nvidiaVram = hasNvidia ? parseInt(gpuList[0].vram) : 0;

    if (systemRam >= 16 && hasNvidia && nvidiaVram >= 6) {
      tier = 'high';
      recommendedLlm = 'llama3.1:8b or deepseek-r1:8b';
      recommendedOcr = 'llava:7b (GPU Accelerated)';
    } else if (systemRam >= 8 && (nvidiaVram >= 3 || cpuCores >= 8)) {
      tier = 'mid';
      recommendedLlm = 'llama3.2:3b (Good balance)';
      recommendedOcr = 'llava:7b';
    }

    res.json({
      software: {
        node: { installed: true, version: nodeVer },
        python: pythonVer,
        git: gitVer,
        ollama: ollamaVer,
        packages: { installed: packagesInstalled }
      },
      hardware: {
        cpu: cpuText,
        ram: ramText,
        gpus: gpuList,
        tier,
        recommendedLlm,
        recommendedOcr
      }
    });
  });
});

// 4. Get Ollama Models
router.get('/ollama-models', (req, res) => {
  const reqOllama = http.request({
    host: '127.0.0.1',
    port: 11434,
    path: '/api/tags',
    method: 'GET',
    timeout: 1500
  }, (ollamaRes) => {
    let data = '';
    ollamaRes.on('data', d => data += d);
    ollamaRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const models = (parsed.models || []).map(m => m.name);
        res.json({ online: true, models });
      } catch (e) {
        res.json({ online: true, models: [] });
      }
    });
  });

  reqOllama.on('error', () => {
    res.json({ online: false, models: [] });
  });

  reqOllama.on('timeout', () => {
    reqOllama.destroy();
    res.json({ online: false, models: [] });
  });

  reqOllama.end();
});

// 5. Pull Ollama Model
router.post('/pull-model', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model name is required' });
  if (typeof model !== 'string' || !/^[a-zA-Z0-9._:/-]+$/.test(model)) {
    return res.status(400).json({ error: 'Invalid model name format' });
  }

  const started = runCommand('ollama', ['pull', model], 'ollama-pull');
  if (started) {
    res.json({ status: 'started' });
  } else {
    res.status(400).json({ error: 'Launcher is busy with another operation' });
  }
});

// 6. Install NPM packages
router.post('/npm-install', (req, res) => {
  if (activeOperation.running) {
    return res.status(400).json({ error: 'Launcher is busy' });
  }

  activeOperation.running = true;
  activeOperation.operation = 'npm-install';
  activeOperation.logContent = '';
  fs.writeFileSync(logFile, `=== STARTING DEPS INSTALL ===\n`, 'utf8');

  writeToLog('[LAUNCHER] Installing Server Dependencies...');
  const serverCwd = path.join(rootDir, 'sos-server');
  const env = { ...process.env, NODE_ENV: 'development' };
  const serverInstall = spawn('npm', ['install'], { cwd: serverCwd, env, shell: true });

  serverInstall.stdout.on('data', d => writeToLog(d.toString().trim()));
  serverInstall.stderr.on('data', d => writeToLog(d.toString().trim()));

  serverInstall.on('close', (serverCode) => {
    if (serverCode !== 0) {
      activeOperation.running = false;
      activeOperation.exitCode = serverCode;
      writeToLog(`[ERROR] Server install failed with exit code ${serverCode}`);
      return;
    }

    writeToLog('[LAUNCHER] Installing Frontend App Dependencies...');
    const appCwd = path.join(rootDir, 'sos-app');
    const appInstall = spawn('npm', ['install'], { cwd: appCwd, env, shell: true });

    appInstall.stdout.on('data', d => writeToLog(d.toString().trim()));
    appInstall.stderr.on('data', d => writeToLog(d.toString().trim()));

    appInstall.on('close', (appCode) => {
      activeOperation.running = false;
      activeOperation.exitCode = appCode;
      if (appCode === 0) {
        writeToLog('✔ All dependencies installed successfully!');
      } else {
        writeToLog(`[ERROR] Frontend install failed with exit code ${appCode}`);
      }
    });
  });

  res.json({ status: 'started' });
});

// 7. Compile Frontend Assets
router.post('/build', (req, res) => {
  const started = runCommand('npm', ['run', 'build'], 'vite-build', path.join(rootDir, 'sos-app'));
  if (started) {
    res.json({ status: 'started' });
  } else {
    res.status(400).json({ error: 'Launcher is busy' });
  }
});

// 8. Launch App (Dev or Production)
router.post('/start-app', (req, res) => {
  const { mode } = req.body; // 'production' or 'development'
  if (!mode) return res.status(400).json({ error: 'Mode is required' });

  if (activeOperation.running) {
    return res.status(400).json({ error: 'Launcher is busy' });
  }

  activeOperation.running = true;
  activeOperation.operation = 'start-app';
  activeOperation.logContent = '';
  fs.writeFileSync(logFile, `=== LAUNCHING APP IN ${mode.toUpperCase()} MODE ===\n`, 'utf8');

  // Handle port stopping first (cleanup)
  const stopPorts = () => {
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      if (isWin) {
        // Simple helper to taskkill on ports 3000 / 3001
        exec('netstat -ano | findstr :3000', (err, stdout) => {
          if (stdout) {
            const pids = new Set(stdout.trim().split('\n').map(line => line.trim().split(/\s+/).pop()));
            pids.forEach(pid => {
              if (pid && /^\d+$/.test(pid)) {
                exec(`taskkill /F /PID ${pid}`);
              }
            });
          }
          exec('netstat -ano | findstr :3001', (err2, stdout2) => {
            if (stdout2) {
              const pids = new Set(stdout2.trim().split('\n').map(line => line.trim().split(/\s+/).pop()));
              // Don't kill current PID!
              pids.delete(process.pid.toString());
              pids.forEach(pid => {
                if (pid && /^\d+$/.test(pid)) {
                  exec(`taskkill /F /PID ${pid}`);
                }
              });
            }
            resolve();
          });
        });
      } else {
        exec('fuser -k 3000/tcp', () => {
          exec('fuser -k 3001/tcp', () => resolve());
        });
      }
    });
  };

  stopPorts().then(() => {
    writeToLog(`[LAUNCHER] Starting SurvivalOS in ${mode} mode...`);

    if (mode === 'production') {
      // In production, we run the built server on 3001
      const env = { ...process.env, NODE_ENV: 'production', PORT: '3001' };
      const child = spawn('node', ['index.js'], {
        cwd: path.join(rootDir, 'sos-server'),
        env,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      writeToLog('✔ Production server process spawned successfully on port 3001.');
      writeToLog('Redirecting browser to http://localhost:3001 in 3 seconds...');
      activeOperation.running = false;
      res.json({ status: 'started', redirectUrl: 'http://localhost:3001' });
    } else {
      // In development, we run Vite dev server on 3000, and node server on 3001
      const env = { ...process.env, NODE_ENV: 'development', PORT: '3001' };
      const serverCwd = path.join(rootDir, 'sos-server');
      const appCwd = path.join(rootDir, 'sos-app');

      const serverChild = spawn('node', ['index.js'], { cwd: serverCwd, env, detached: true, stdio: 'ignore' });
      serverChild.unref();

      const appChild = spawn('npm', ['run', 'dev'], { cwd: appCwd, detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
      appChild.unref();

      writeToLog('✔ Development servers spawned successfully (backend 3001, frontend 3000).');
      writeToLog('Redirecting browser to http://localhost:3000 in 4 seconds...');
      activeOperation.running = false;
      res.json({ status: 'started', redirectUrl: 'http://localhost:3000' });
    }
  });
});

// 9. Stop Services
router.post('/stop', (req, res) => {
  writeToLog('[LAUNCHER] Stopping running port services...');
  const isWin = process.platform === 'win32';
  if (isWin) {
    exec('netstat -ano | findstr :3000', (err, stdout) => {
      if (stdout) {
        const pids = new Set(stdout.trim().split('\n').map(line => line.trim().split(/\s+/).pop()));
        pids.forEach(pid => {
          if (pid && /^\d+$/.test(pid)) {
            exec(`taskkill /F /PID ${pid}`);
          }
        });
      }
      exec('netstat -ano | findstr :3001', (err2, stdout2) => {
        if (stdout2) {
          const pids = new Set(stdout2.trim().split('\n').map(line => line.trim().split(/\s+/).pop()));
          pids.delete(process.pid.toString());
          pids.forEach(pid => {
            if (pid && /^\d+$/.test(pid)) {
              exec(`taskkill /F /PID ${pid}`);
            }
          });
        }
        res.json({ status: 'stopped' });
      });
    });
  } else {
    exec('fuser -k 3000/tcp', () => {
      exec('fuser -k 3001/tcp', () => {
        res.json({ status: 'stopped' });
      });
    });
  }
});

module.exports = router;
