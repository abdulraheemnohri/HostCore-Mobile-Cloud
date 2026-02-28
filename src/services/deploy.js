const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const pm2 = require('pm2');
const AdmZip = require('adm-zip');
const { db } = require('./db');

async function deployApp(req, res) {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const zipPath = req.file.path;
    const appName = (req.body.name || path.parse(req.file.originalname).name).replace(/[^a-z0-9-_]/gi, '_');
    const targetDir = path.join(__dirname, '../../apps', appName);

    try {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        new AdmZip(zipPath).extractAllTo(targetDir, true);

        let type = 'node', entryPoint = '', installCmd = '';
        if (fs.existsSync(path.join(targetDir, 'package.json'))) {
            type = 'node';
            entryPoint = path.join(targetDir, 'index.js');
            installCmd = 'npm install';
            const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
            if (pkg.main) entryPoint = path.join(targetDir, pkg.main);
        } else {
            type = 'static';
            entryPoint = path.join(targetDir, 'hc-static.js');
        }

        db.get(`SELECT MAX(port) as maxPort FROM apps`, [], (err, row) => {
            const port = (row && row.maxPort) ? row.maxPort + 1 : 4001;
            if (installCmd) {
                exec(installCmd, { cwd: targetDir }, () => startApp(appName, type, entryPoint, port, targetDir, req.user.id, res, zipPath));
            } else {
                startApp(appName, type, entryPoint, port, targetDir, req.user.id, res, zipPath);
            }
        });
    } catch (e) {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        res.status(500).json({ message: 'Deployment failed: ' + e.message });
    }
}

function startApp(appName, type, entryPoint, port, targetDir, userId, res, zipPath) {
    pm2.connect((err) => {
        const pm2Config = { name: appName, script: entryPoint, cwd: targetDir, env: { PORT: port } };
        if (type === 'static') {
            fs.writeFileSync(entryPoint, `const http = require('http'); const fs = require('fs'); const path = require('path'); http.createServer((req, res) => { let fp = path.join(__dirname, req.url === '/' ? 'index.html' : req.url); fs.readFile(fp, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200); res.end(data); }); }).listen(process.env.PORT);`);
        }
        pm2.start(pm2Config, (err) => {
            db.run(`INSERT OR REPLACE INTO apps (name, type, port, status, path, route, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [appName, type, port, 'running', entryPoint, `/${appName}`, userId], () => {
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                res.json({ message: 'App deployed', name: appName, port, url: `/${appName}` });
            });
        });
    });
}

module.exports = { deployApp };
