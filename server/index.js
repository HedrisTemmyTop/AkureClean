const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
// Need raw body for Paystack webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/bills/verify' || req.originalUrl === '/api/pickup/verify') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/household', require('./src/routes/household'));
app.use('/api/zones', require('./src/routes/zone'));
app.use('/api/bills', require('./src/routes/bill'));
app.use('/api/routes', require('./src/routes/route'));
app.use('/api/driver', require('./src/routes/driver'));
app.use('/api/pickup', require('./src/routes/pickup'));
app.use('/api/admin', require('./src/routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running normally' });
});

// Initialize Cron Jobs
require('./src/services/billingCron');

// Error handling middleware
app.use(errorHandler);

const PORT = env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`));
