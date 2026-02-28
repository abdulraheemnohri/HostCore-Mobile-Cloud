const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../services/db');
const SECRET_KEY = process.env.SECRET_KEY || 'hostcore_secret_key';

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], (err) => {
        if (err) return res.status(400).json({ message: 'Registration failed' });
        res.status(201).json({ message: 'User registered' });
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token });
    });
});

module.exports = router;
