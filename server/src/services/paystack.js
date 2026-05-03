const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');

const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

exports.initializeTransaction = async (email, amount, metadata) => {
  try {
    const response = await paystackApi.post('/transaction/initialize', {
      email,
      amount: amount * 100, // Paystack amount is in kobo
      metadata
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error initializing Paystack transaction');
  }
};

exports.verifyTransaction = async (reference) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error verifying Paystack transaction');
  }
};

exports.validateWebhookSignature = (req) => {
  const secret = env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  return hash === req.headers['x-paystack-signature'];
};
