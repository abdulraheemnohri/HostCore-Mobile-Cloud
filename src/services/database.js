const { exec } = require('child_process');

async function createDb(type, name, user, password) {
    return new Promise((resolve, reject) => {
        let cmd = '';
        if (type === 'mariadb') {
            cmd = `mariadb -e "CREATE DATABASE IF NOT EXISTS ${name}; CREATE USER IF NOT EXISTS '${user}'@'localhost' IDENTIFIED BY '${password}'; GRANT ALL PRIVILEGES ON ${name}.* TO '${user}'@'localhost';"`;
        } else if (type === 'postgresql') {
            cmd = `psql -c "CREATE DATABASE ${name}; CREATE USER ${user} WITH ENCRYPTED PASSWORD '${password}'; GRANT ALL PRIVILEGES ON DATABASE ${name} TO ${user};"`;
        } else {
            return reject(new Error('Unsupported DB type'));
        }
        exec(cmd, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve(stdout);
        });
    });
}

async function getDbStatus() {
    return new Promise((resolve) => {
        exec('pgrep -x mariadbd || pgrep -x mysqld', (err1) => {
            exec('pgrep -x postgres', (err2) => {
                resolve({
                    mariadb: !err1,
                    postgresql: !err2
                });
            });
        });
    });
}

module.exports = { createDb, getDbStatus };
