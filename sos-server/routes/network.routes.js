const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');

// GET active network interfaces (IPv4, non-internal)
router.get('/interfaces', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const list = [];

    Object.entries(interfaces).forEach(([name, addrs]) => {
      addrs.forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          list.push({
            name,
            ip: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
            type: name.toLowerCase().includes('wlan') || name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') ? 'Wireless' : 'Wired'
          });
        }
      });
    });

    res.json(list);
  } catch (err) {
    console.error("Failed to query network interfaces:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST to generate Nginx LAN reverse proxy config
router.post('/generate-nginx', (req, res) => {
  try {
    const { localIp } = req.body;
    if (!localIp) return res.status(400).json({ error: "localIp is required" });

    const templatePath = path.join(__dirname, '..', '..', 'docs', 'networking', 'nginx-lan-setup.conf');
    let template = '';
    
    if (fs.existsSync(templatePath)) {
      template = fs.readFileSync(templatePath, 'utf8');
      // Replace template placeholder IP with actual local IP
      template = template.replace(/192\.168\.1\.100/g, localIp);
    } else {
      // Inline fallback template if docs folder isn't fully set up in target environment
      template = `# SurvivalOS Offline LAN Nginx Config
server {
    listen 80;
    server_name ${localIp} localhost _ ;

    client_max_body_size 100M;

    location / {
        root ${path.resolve(__dirname, '..', '..', 'sos-app', 'dist')};
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api/chat {
        proxy_pass http://127.0.0.1:3001/api/chat;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

    location /materials/ {
        proxy_pass http://127.0.0.1:3001/materials/;
    }
}`;
    }

    // Write file to server working directory as survivalos_lan.conf
    const outputPath = path.join(__dirname, '..', 'survivalos_lan.conf');
    fs.writeFileSync(outputPath, template, 'utf8');

    res.json({
      success: true,
      filePath: outputPath,
      configText: template
    });
  } catch (err) {
    console.error("Failed to generate Nginx config:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
