const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/register', [
  check('name', 'Name is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('phone', 'Phone number is required').notEmpty()
], authController.register);

router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], authController.login);

router.post('/refresh', authController.refresh);

module.exports = router;
