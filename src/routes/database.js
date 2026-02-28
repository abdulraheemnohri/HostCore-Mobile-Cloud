const express = require('express');
const router = express.Router();
const { createDb, getDbStatus } = require('../services/database');

router.post('/create', async (req, res) => {
    const { type, name, user, password } = req.body;
    try {
        await createDb(type, name, user, password);
        res.json({ message: 'Database created successfully' });
    } catch (e) {
        res.status(500).json({ message: 'Database creation failed: ' + e.message });
    }
});

router.get('/status', async (req, res) => {
    res.json(await getDbStatus());
});

module.exports = router;
