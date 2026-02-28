const si = require('systeminformation');
const pm2 = require('pm2');
const os = require('os');
const { getTermuxStats } = require('./termux');

function initMonitoring(io) {
    pm2.connect(() => {});
    io.on('connection', (socket) => {
        const interval = setInterval(async () => {
            try {
                const cpu = await si.currentLoad();
                const mem = await si.mem();
                const disk = await si.fsSize();
                const processes = await new Promise((resolve) => {
                    pm2.list((err, list) => {
                        if (err) return resolve([]);
                        resolve(list.filter(p => p.name !== 'hostcore-pro').map(p => ({
                            name: p.name,
                            cpu: p.monit.cpu,
                            memory: p.monit.memory
                        })));
                    });
                });
                const termux = getTermuxStats();
                socket.emit('stats', {
                    cpu: cpu.currentLoad,
                    mem: (mem.active / mem.total) * 100,
                    disk: disk[0] ? disk[0].use : 0,
                    apps: processes,
                    uptime: os.uptime(),
                    termux: termux
                });
            } catch (e) {}
        }, 2000);
        socket.on('disconnect', () => { clearInterval(interval); });
    });
}

module.exports = { initMonitoring };
