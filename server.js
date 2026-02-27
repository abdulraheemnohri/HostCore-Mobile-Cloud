const express = require('express');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const httpProxy = require('http-proxy');
const pm2 = require('pm2');
const si = require('systeminformation');
const { Server } = require('socket.io');
const multer = require('multer');
const AdmZip = require('adm-zip');
const ngrok = require('ngrok');
const cron = require('node-cron');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Multer setup for ZIP uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });
const proxy = httpProxy.createProxyServer({});
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'hostcore_secret_key';

// Ensure required directories exist
const dirs = ['apps', 'uploads', 'backups', 'logs'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

app.use(express.json());

// Reverse Proxy Middleware
app.use((req, res, next) => {
    // Reserved system routes
    const reserved = ['api', 'login.html', 'dashboard.html', 'deploy.html', 'apps.html', 'db.html', 'settings.html', 'socket.io'];

    // Check if path starts with an app route
    // Expected path: /appname/path
    const parts = req.path.split('/');
    if (parts.length > 1 && !reserved.includes(parts[1]) && parts[1] !== '') {
        const appName = parts[1];
        db.get(`SELECT * FROM apps WHERE name = ? AND status = 'running'`, [appName], (err, row) => {
            if (err) return res.status(500).send('Proxy error');
            if (row) {
                const target = `http://localhost:${row.port}`;
                // Strip the app name from the path for the target
                req.url = req.url.replace(`/${appName}`, '') || '/';

                proxy.web(req, res, { target }, (e) => {
                    console.error(`Proxy error for ${appName}:`, e.message);
                    res.status(502).send('App unreachable');
                });
                return;
            }
            next();
        });
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Proxy error handling
proxy.on('error', (err, req, res) => {
    console.error('Proxy generic error:', err);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Proxy Error');
});

// Database setup
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            type TEXT,
            port INTEGER,
            status TEXT,
            path TEXT,
            route TEXT,
            user_id INTEGER,
            memory_limit INTEGER,
            cpu_limit INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
    });
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing fields' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;

    db.run(sql, [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ message: 'User registered' });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing fields' });

    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// Settings API
app.get('/api/settings', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM settings`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    });
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const { settings } = req.body;
    if (!settings) return res.status(400).json({ message: 'No settings provided' });

    const stmt = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    Object.keys(settings).forEach(key => {
        stmt.run(key, settings[key]);
    });
    stmt.finalize(() => {
        res.json({ message: 'Settings saved' });
    });
});

// Ngrok API
let ngrokUrl = null;
app.post('/api/ngrok/start', authenticateToken, async (req, res) => {
    db.get(`SELECT value FROM settings WHERE key = 'ngrok_token'`, async (err, row) => {
        const token = row ? row.value : null;
        if (!token) return res.status(400).json({ message: 'Ngrok token not set' });

        try {
            if (ngrokUrl) await ngrok.disconnect();
            ngrokUrl = await ngrok.connect({
                authtoken: token,
                addr: PORT
            });
            res.json({ url: ngrokUrl });
        } catch (e) {
            res.status(500).json({ message: 'Ngrok error: ' + e.message });
        }
    });
});

app.post('/api/ngrok/stop', authenticateToken, async (req, res) => {
    try {
        await ngrok.disconnect();
        ngrokUrl = null;
        res.json({ message: 'Ngrok stopped' });
    } catch (e) {
        res.status(500).json({ message: 'Ngrok error' });
    }
});

app.get('/api/ngrok/status', authenticateToken, (req, res) => {
    res.json({ url: ngrokUrl });
});

// Database Management API
app.get('/api/database/status', authenticateToken, (req, res) => {
    // In Termux, we check if mysql/psql commands work or if services are up
    exec('pgrep -x mariadbd || pgrep -x mysqld', (err1) => {
        exec('pgrep -x postgres', (err2) => {
            res.json({
                mariadb: !err1,
                postgresql: !err2
            });
        });
    });
});

// Maintenance API
app.post('/api/maintenance/backup', authenticateToken, (req, res) => {
    exec('./backup.sh', (err, stdout, stderr) => {
        if (err) return res.status(500).json({ message: 'Backup failed', error: stderr });
        res.json({ message: 'Backup completed', details: stdout });
    });
});

app.post('/api/maintenance/wipe', authenticateToken, (req, res) => {
    // Dangerous: only allow admin or specific user if needed
    // For now, let's just implement the logic to clear apps from DB and folder
    db.run(`DELETE FROM apps WHERE user_id = ?`, [req.user.id], (err) => {
        if (err) return res.status(500).json({ message: 'Wipe failed' });
        // Optionally delete folders in apps/ (complex to match user_id to folder name safely here)
        res.json({ message: 'Applications wiped from database' });
    });
});

// Automated Backups
cron.schedule('0 0 * * *', () => {
    console.log('Running daily automated backup...');
    exec('./backup.sh', (err) => {
        if (err) console.error('Automated backup failed');
        else console.log('Automated backup successful');
    });
});

// File Manager API
app.get('/api/apps/:name/files', authenticateToken, (req, res) => {
    const { name } = req.params;
    const subPath = req.query.path || '';

    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, appRecord) => {
        if (err || !appRecord) return res.status(404).json({ message: 'App not found' });

        const appDir = path.dirname(appRecord.path);
        const targetPath = path.join(appDir, subPath);

        // Safety check to prevent directory traversal
        if (!targetPath.startsWith(appDir)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!fs.existsSync(targetPath)) return res.status(404).json({ message: 'File not found' });

        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(targetPath).map(f => {
                const s = fs.statSync(path.join(targetPath, f));
                return { name: f, isDirectory: s.isDirectory(), size: s.size };
            });
            res.json({ isDirectory: true, files });
        } else {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ isDirectory: false, content });
        }
    });
});

// App Management API
app.get('/api/apps', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM apps WHERE user_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

app.post('/api/apps/:name/start', authenticateToken, (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, appRecord) => {
        if (err || !appRecord) return res.status(404).json({ message: 'App not found or access denied' });

        pm2.connect((err) => {
            if (err) return res.status(500).json({ message: 'PM2 connect error' });
            pm2.start({
                name: appRecord.name,
                script: appRecord.path,
                cwd: path.dirname(appRecord.path),
                max_memory_restart: appRecord.memory_limit ? `${appRecord.memory_limit}M` : undefined,
            }, (err) => {
                if (err) return res.status(500).json({ message: 'PM2 start error' });
                db.run(`UPDATE apps SET status = 'running' WHERE name = ?`, [name], () => {
                    res.json({ message: 'App started' });
                });
            });
        });
    });
});

app.post('/api/apps/:name/stop', authenticateToken, (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, appRecord) => {
        if (err || !appRecord) return res.status(404).json({ message: 'App not found or access denied' });

        pm2.connect((err) => {
            if (err) return res.status(500).json({ message: 'PM2 connect error' });
            pm2.stop(name, (err) => {
                db.run(`UPDATE apps SET status = 'stopped' WHERE name = ?`, [name], () => {
                    res.json({ message: 'App stopped' });
                });
            });
        });
    });
});

app.delete('/api/apps/:name', authenticateToken, (req, res) => {
    const { name } = req.params;
    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, appRecord) => {
        if (err || !appRecord) return res.status(404).json({ message: 'App not found or access denied' });

        pm2.connect((err) => {
            if (err) return res.status(500).json({ message: 'PM2 connect error' });
            pm2.delete(name, (err) => {
                // Remove from DB and potentially delete files
                db.run(`DELETE FROM apps WHERE name = ?`, [name], () => {
                    // Logic to delete app files could go here
                    res.json({ message: 'App deleted' });
                });
            });
        });
    });
});

app.post('/api/deploy', authenticateToken, upload.single('appZip'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const zipPath = req.file.path;
    // Sanitize app name to prevent path traversal
    const rawName = req.body.name || path.parse(req.file.originalname).name;
    const appName = rawName.replace(/[^a-z0-9-_]/gi, '_');
    const targetDir = path.join(__dirname, 'apps', appName);

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(targetDir, true);

        // App Type Detection
        let type = 'static';
        let entryPoint = '';
        let installCmd = '';

        if (fs.existsSync(path.join(targetDir, 'package.json'))) {
            type = 'node';
            entryPoint = path.join(targetDir, 'index.js'); // Default
            installCmd = 'npm install';
            // Try to find main in package.json
            const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
            if (pkg.main) entryPoint = path.join(targetDir, pkg.main);
        } else if (fs.existsSync(path.join(targetDir, 'requirements.txt')) || fs.existsSync(path.join(targetDir, 'app.py'))) {
            type = 'python';
            entryPoint = path.join(targetDir, 'app.py');
            installCmd = fs.existsSync(path.join(targetDir, 'requirements.txt')) ? 'pip install -r requirements.txt' : '';
        }

        // Port Assignment
        db.get(`SELECT MAX(port) as maxPort FROM apps`, [], (err, row) => {
            const port = (row && row.maxPort) ? row.maxPort + 1 : 4000;

            // Install dependencies if needed
            if (installCmd && !process.env.SKIP_INSTALL) {
                console.log(`Installing dependencies for ${appName}...`);
                exec(installCmd, { cwd: targetDir }, (err) => {
                    if (err) console.error(`Dependency install failed for ${appName}:`, err);
                    startApp();
                });
            } else {
                startApp();
            }

            function startApp() {
                pm2.connect((err) => {
                    if (err) return res.status(500).json({ message: 'PM2 connect error' });

                    const pm2Config = {
                        name: appName,
                        script: entryPoint || targetDir, // static fallback
                        cwd: targetDir,
                        env: { PORT: port },
                        max_memory_restart: req.body.memoryLimit ? `${req.body.memoryLimit}M` : undefined,
                    };

                    if (type === 'static') {
                        // For static apps, we might need a simple server
                        // For now let's assume we don't start it via PM2 or we start a simple serve
                        // Actually let's just use a simple express server for static
                        fs.writeFileSync(path.join(targetDir, 'hc-static-server.js'), `
                            const express = require('express');
                            const app = express();
                            app.use(express.static(__dirname));
                            app.listen(process.env.PORT);
                        `);
                        pm2Config.script = path.join(targetDir, 'hc-static-server.js');
                    }

                    pm2.start(pm2Config, (err) => {
                        if (err) {
                            console.error('PM2 Start Error:', err);
                            return res.status(500).json({ message: 'PM2 start error' });
                        }

                        db.run(`INSERT OR REPLACE INTO apps (name, type, port, status, path, route, user_id, memory_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [appName, type, port, 'running', pm2Config.script, `/${appName}`, req.user.id, req.body.memoryLimit || null],
                            (err) => {
                                if (err) console.error('DB Insert Error:', err);
                                res.json({
                                    message: 'App deployed and running',
                                    name: appName,
                                    url: `/${appName}`,
                                    port: port
                                });
                            }
                        );
                    });
                });
            }
        });
    } catch (e) {
        console.error('Deployment error:', e);
        res.status(500).json({ message: 'Deployment failed' });
    }
});

app.get('/api/apps/:name/logs', authenticateToken, (req, res) => {
    const { name } = req.params;

    db.get(`SELECT * FROM apps WHERE name = ? AND user_id = ?`, [name, req.user.id], (err, appRecord) => {
        if (err || !appRecord) return res.status(404).json({ message: 'App not found or access denied' });

        // PM2 doesn't easily provide logs via API in a string format,
    // usually we'd read the log files.
    const logPath = path.join(process.env.HOME || process.env.USERPROFILE, '.pm2', 'logs', `${name}-out.log`);
    const errorLogPath = path.join(process.env.HOME || process.env.USERPROFILE, '.pm2', 'logs', `${name}-error.log`);

        try {
            const out = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').slice(-5000) : '';
            const err = fs.existsSync(errorLogPath) ? fs.readFileSync(errorLogPath, 'utf8').slice(-5000) : '';
            res.json({ out, err });
        } catch (e) {
            res.status(500).json({ message: 'Error reading logs' });
        }
    });
});

// WebSocket Monitoring
io.on('connection', (socket) => {
    console.log('Client connected to monitoring');

    const interval = setInterval(async () => {
        try {
            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const processes = await new Promise((resolve) => {
                pm2.list((err, list) => {
                    if (err) resolve([]);
                    resolve(list.map(p => ({
                        name: p.name,
                        cpu: p.monit.cpu,
                        memory: p.monit.memory
                    })));
                });
            });

            socket.emit('stats', {
                cpu: cpu.currentLoad,
                mem: (mem.active / mem.total) * 100,
                memUsed: mem.active,
                memTotal: mem.total,
                apps: processes,
                uptime: os.uptime()
            });
        } catch (e) {
            console.error('Monitoring error:', e);
        }
    }, 2000);

    socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Client disconnected from monitoring');
    });
});

server.listen(PORT, () => {
    console.log(`HostCore Server running on port ${PORT}`);
});
