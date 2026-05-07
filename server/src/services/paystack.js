const axios = require("axios");
const crypto = require("crypto");
const env = require("../config/env");

const paystackApi = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

exports.initializeTransaction = async (
  email,
  amount,
  metadata,
  callback_url,
) => {
  try {
    console.log("[Paystack Service] Input Data:", {
      email,
      amount,
      metadata,
      callback_url,
    });
    const cleanEmail = email ? email.trim() : "";
    if (!cleanEmail) throw new Error("User email is missing or empty");

    console.log("[Paystack Service] Initializing:", {
      email: cleanEmail,
      amount,
      callback_url,
    });
    const response = await paystackApi.post("/transaction/initialize", {
      email: cleanEmail,
      amount: Math.round(amount * 100), // Ensure it's an integer
      metadata,
      callback_url,
    });
    return response.data;
  } catch (error) {
    console.error(
      "[Paystack Service] Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message ||
        "Error initializing Paystack transaction",
    );
  }
};

exports.verifyTransaction = async (reference) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error verifying Paystack transaction",
    );
  }
};

exports.validateWebhookSignature = (req) => {
  const secret = env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.body)
    .digest("hex");
  return hash === req.headers["x-paystack-signature"];
};
