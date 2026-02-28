const { execSync } = require('child_process');

function getTermuxStats() {
    const stats = { battery: null, wifi: null, telephony: null };
    try {
        const batteryJson = execSync('termux-battery-status', { encoding: 'utf8' });
        stats.battery = JSON.parse(batteryJson);
    } catch (e) {}

    try {
        const wifiJson = execSync('termux-wifi-connectioninfo', { encoding: 'utf8' });
        stats.wifi = JSON.parse(wifiJson);
    } catch (e) {}

    return stats;
}

function sendNotification(title, content) {
    try {
        execSync(`termux-notification -t "${title}" -c "${content}" --id hostcore_notify`);
    } catch (e) {}
}

function showToast(message) {
    try {
        execSync(`termux-toast "${message}"`);
    } catch (e) {}
}

module.exports = { getTermuxStats, sendNotification, showToast };
