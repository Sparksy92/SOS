const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Mock data around a central off-grid location
const MOCK_NODES = [
  { id: "!12345678", name: "BASE STATION", latitude: 37.5407, longitude: -77.4360, battery: 98, lastSeen: new Date().toISOString(), role: "base" },
  { id: "!87654321", name: "PATROL ALPHA", latitude: 37.5430, longitude: -77.4320, battery: 74, lastSeen: new Date().toISOString(), role: "mobile" },
  { id: "!11223344", name: "WATER SPRING MONITOR", latitude: 37.5380, longitude: -77.4410, battery: 89, lastSeen: new Date().toISOString(), role: "sensor" }
];

router.get('/nodes', (req, res) => {
  try {
    let meshtasticIp = '';
    try {
      const stmt = db.prepare("SELECT value FROM settings WHERE key = 'meshtastic_ip'");
      const row = stmt.get();
      if (row) meshtasticIp = row.value;
    } catch (e) {
      // Settings table fallback
    }

    // Always include mock nodes for off-grid map visualization testing
    return res.json(MOCK_NODES);
  } catch (err) {
    console.error("Failed to query Meshtastic nodes:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
