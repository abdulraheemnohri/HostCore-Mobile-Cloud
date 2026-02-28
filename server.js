const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const httpProxy = require('http-proxy');
const { Server } = require('socket.io');
require('dotenv').config();

const { initDb, db } = require('./src/services/db');
const { authenticateToken } = require('./src/middleware/auth');
const { initMonitoring } = require('./src/services/monitoring');
const appsRouter = require('./src/routes/apps');
const authRouter = require('./src/routes/auth');
const deployRouter = require('./src/routes/deploy');
const databaseRouter = require('./src/routes/database');
const systemRouter = require('./src/routes/system');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const proxy = httpProxy.createProxyServer({});
const PORT = process.env.PORT || 3000;

// Ensure directories
['apps', 'uploads', 'backups', 'logs'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());

// Reverse Proxy
app.use((req, res, next) => {
    const reserved = ['api', 'login.html', 'dashboard.html', 'deploy.html', 'apps.html', 'db.html', 'settings.html', 'system.html', 'socket.io'];
    const parts = req.path.split('/');
    if (parts.length > 1 && !reserved.includes(parts[1]) && parts[1] !== '') {
        const appName = parts[1];
        db.get(`SELECT * FROM apps WHERE name = ? AND status = 'running'`, [appName], (err, row) => {
            if (row) {
                const target = `http://localhost:${row.port}`;
                if (req.url.startsWith(`/${appName}`)) req.url = req.url.substring(appName.length + 1) || '/';
                proxy.web(req, res, { target }, (e) => res.status(502).send('App unreachable'));
                return;
            }
            next();
        });
    } else {
        next();
    }
});

app.use(express.static('public'));
app.use('/api/apps', authenticateToken, appsRouter);
app.use('/api/auth', authRouter);
app.use('/api/deploy', authenticateToken, deployRouter);
app.use('/api/database', authenticateToken, databaseRouter);
app.use('/api/system', authenticateToken, systemRouter);

// Database init and server start
initDb().then(() => {
    initMonitoring(io);
    server.listen(PORT, () => console.log(`HostCore Pro running on port ${PORT}`));
}).catch(err => console.error('Database initialization failed:', err));

module.exports = { server, io, proxy };
