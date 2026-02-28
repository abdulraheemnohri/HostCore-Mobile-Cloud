const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

function initDb() {
    return new Promise((resolve, reject) => {
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
                env_vars TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

module.exports = { db, initDb };
