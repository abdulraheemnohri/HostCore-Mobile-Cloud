const express = require('express');
const router = express.Router();
const { db } = require('../services/db');
const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { showToast } = require('../services/termux');

// Get all apps
router.get('/', (req, res) => {
    db.all(`SELECT * FROM apps WHERE user_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// App lifecycle
router.post('/:name/start', (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'App not found' });
        pm2.connect((err) => {
            pm2.start({ name: row.name, script: row.path, cwd: path.dirname(row.path), env: { PORT: row.port } }, (err) => {
                if (err) return res.status(500).json({ message: 'Start failed' });
                db.run(`UPDATE apps SET status = 'running' WHERE name = ?`, [name], () => {
                    showToast(`App ${name} started`);
                    res.json({ message: 'Started' });
                });
            });
        });
    });
});

router.post('/:name/stop', (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'App not found' });
        pm2.connect((err) => {
            pm2.stop(name, () => {
                db.run(`UPDATE apps SET status = 'stopped' WHERE name = ?`, [name], () => res.json({ message: 'Stopped' }));
            });
        });
    });
});

router.delete('/:name', (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'App not found' });
        pm2.connect((err) => {
            pm2.delete(name, () => {
                const appDir = path.join(__dirname, '../../apps', name);
                if (fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
                db.run(`DELETE FROM apps WHERE name = ?`, [name], () => res.json({ message: 'Deleted' }));
            });
        });
    });
});

// Logs and Health
router.get('/:name/logs', (req, res) => {
    const { name } = req.params;
    const logPath = path.join(process.env.HOME || '', '.pm2/logs', `${name}-out.log`);
    if (fs.existsSync(logPath)) {
        res.json({ out: fs.readFileSync(logPath, 'utf8').slice(-5000) });
    } else {
        res.json({ out: 'No logs available' });
    }
});

router.get('/:name/health', (req, res) => {
    const { name } = req.params;
    db.get(`SELECT port FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ message: 'App not found' });
        const client = http.get(`http://localhost:${row.port}`, { timeout: 2000 }, (response) => {
            res.json({ status: response.statusCode === 200 ? 'healthy' : 'unhealthy' });
        });
        client.on('error', () => res.json({ status: 'unhealthy' }));
    });
});

module.exports = router;
