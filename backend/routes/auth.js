const express = require('express');
const router = express.Router();
const { register, login, me, passwordReset, confirmPasswordReset, refreshToken, logout, devSeedAccounts } = require('../controllers/authController');
const authenticate = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/password-reset', passwordReset);
router.post('/password-reset/confirm', confirmPasswordReset);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/dev/seed', devSeedAccounts);

module.exports = router;
