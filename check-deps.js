const pkg = require('./package.json');
const fs = require('fs');
const path = require('path');

console.log('Checking dependencies...');

const missing = [];
Object.keys(pkg.dependencies).forEach(dep => {
    try {
        require.resolve(dep);
    } catch (e) {
        missing.push(dep);
    }
});

if (missing.length > 0) {
    console.error('Missing dependencies:', missing.join(', '));
    console.log('Attempting to install missing packages...');
    const { execSync } = require('child_process');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('Dependencies installed successfully.');
    } catch (e) {
        console.error('Failed to install dependencies automatically. Please run "npm install" manually.');
        process.exit(1);
    }
} else {
    console.log('All dependencies are present.');
}

// Native module verification
try {
    const sqlite3 = require('sqlite3');
    console.log('Native module sqlite3 verified.');
} catch (e) {
    console.error('CRITICAL: Native module sqlite3 failed to load:', e.message);
    console.log('Please run ./fix-termux.sh to fix library issues.');
    process.exit(1);
}
