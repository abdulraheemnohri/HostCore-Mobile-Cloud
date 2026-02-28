const fs = require('fs');
const { execSync } = require('child_process');

function check() {
    console.log('--- HostCore Pre-flight Check ---');
    const bins = ['node', 'pm2', 'mariadb', 'psql', 'python3', 'pip'];
    bins.forEach(bin => {
        try {
            execSync(`which ${bin}`);
            console.log(`[OK] ${bin}`);
        } catch (e) {
            console.log(`[MISSING] ${bin}`);
        }
    });

    const dirs = ['apps', 'uploads', 'backups', 'logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            console.log(`[CREATED] ${dir}/`);
        }
    });
}

check();
