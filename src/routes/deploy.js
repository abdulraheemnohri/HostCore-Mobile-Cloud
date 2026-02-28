const express = require('express');
const router = express.Router();
const multer = require('multer');
const { deployApp } = require('../services/deploy');
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('appZip'), deployApp);

module.exports = router;
