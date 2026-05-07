const paystackService = require("../services/paystack");
const Bill = require("../models/Bill");
const PickupRequest = require("../models/PickupRequest");
const asyncHandler = require("../utils/asyncHandler");

exports.initialize = asyncHandler(async (req, res) => {
  const { amount, metadata, callback_url } = req.body;
  const email = "hedristemitope2001@gmail.com";
  console.log("this is the email", email);

  if (!amount) {
    return res
      .status(400)
      .json({ success: false, message: "Amount is required" });
  }

  try {
    const response = await paystackService.initializeTransaction(
      email,
      Number(amount),
      metadata,
      callback_url,
    );

    res.json({
      success: true,
      data: {
        authorizationUrl: response.data.authorization_url,
        reference: response.data.reference,
      },
    });
  } catch (error) {
    console.error("[Paystack Init] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error initializing Paystack transaction",
      details: error.response?.data || null,
    });
  }
});

exports.verify = asyncHandler(async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res
      .status(400)
      .json({ success: false, message: "Reference is required" });
  }

  const verification = await paystackService.verifyTransaction(reference);

  if (verification.data.status === "success") {
    const { metadata } = verification.data;

    if (metadata && metadata.type === "monthly_bill") {
      const bill = await Bill.findById(metadata.billId);
      if (bill && bill.status !== "paid") {
        bill.status = "paid";
        bill.paystackReference = reference;
        bill.paidAt = new Date();
        await bill.save();
        console.log(`[Paystack Verify] Bill ${bill._id} marked as paid`);
      }
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Payment verification failed",
      details: verification.data,
    });
  }
});

exports.webhook = asyncHandler(async (req, res) => {
  const isValid = paystackService.validateWebhookSignature(req);
  if (!isValid) {
    console.error("Invalid Paystack Webhook Signature");
    return res.status(400).send("Invalid Signature");
  }

  const event = JSON.parse(req.body);
  console.log("[Paystack Webhook] Event Received:", event.event);

  if (event.event === "charge.success") {
    const { reference } = event.data;
    let metadata = event.data.metadata;

    // Paystack metadata can sometimes be returned as a JSON string
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error("[Paystack Webhook] Failed to parse metadata string:", e);
      }
    }

    console.log("[Paystack Webhook] Metadata:", metadata);

    if (metadata && metadata.type === "monthly_bill") {
      console.log("[Paystack Webhook] Processing Bill:", metadata.billId);
      const bill = await Bill.findById(metadata.billId);
      if (!bill)
        console.error("[Paystack Webhook] Bill not found:", metadata.billId);

      if (bill && bill.status !== "paid") {
        const verification = await paystackService.verifyTransaction(reference);
        console.log(
          "[Paystack Webhook] Verification Status:",
          verification.data.status,
        );

        if (verification.data.status === "success") {
          bill.status = "paid";
          bill.paystackReference = reference;
          bill.paidAt = new Date();
          await bill.save();
          console.log(`[Paystack Webhook] Bill ${bill._id} marked as paid`);
        }
      }
    }
  }

  res.sendStatus(200);
});
