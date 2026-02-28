const express = require('express');
const router = express.Router();
const { db } = require('../services/db');
const si = require('systeminformation');
const { exec } = require('child_process');
const pm2 = require('pm2');
const path = require('path');
const fs = require('fs');

// Settings
router.get('/settings', (req, res) => {
    db.all(`SELECT * FROM settings`, (err, rows) => {
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

router.post('/settings', (req, res) => {
    const { settings } = req.body;
    Object.keys(settings).forEach(key => {
        db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, settings[key]]);
    });
    res.json({ message: 'Settings saved' });
});

// System Details
router.get('/system/details', async (req, res) => {
    try {
        const cpu = await si.cpu();
        const mem = await si.mem();
        const osInfo = await si.osInfo();
        const disk = await si.fsSize();
        res.json({ cpu, mem, os: osInfo, disk: disk[0], node: process.version });
    } catch (e) { res.status(500).json({ message: 'Error fetching system info' }); }
});

// Maintenance
router.post('/maintenance/backup', (req, res) => {
    exec('./backup.sh', (err, stdout, stderr) => {
        if (err) return res.status(500).json({ message: 'Backup failed', error: stderr });
        res.json({ message: 'Backup completed' });
    });
});

router.post('/maintenance/wipe', (req, res) => {
    db.all(`SELECT name FROM apps WHERE user_id = ?`, [req.user.id], (err, rows) => {
        pm2.connect((err) => {
            rows.forEach(r => {
                pm2.delete(r.name, () => {});
                const appDir = path.join(__dirname, '../../apps', r.name);
                if (fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
            });
            db.run(`DELETE FROM apps WHERE user_id = ?`, [req.user.id], () => {
                res.json({ message: 'All applications wiped' });
            });
        });
    });
});

module.exports = router;
