const Bill = require("../models/Bill");
const User = require("../models/User");
const paystackService = require("../services/paystack");
const asyncHandler = require("../utils/asyncHandler");

const calculateBillAmount = (user) => {
  if (user.houseType === "Residential building") {
    return (user.numberOfRooms || 0) * 2000;
  }
  if (user.houseType === "Shop") {
    return (user.numberOfShops || 0) * 3000;
  }
  if (user.houseType === "Company") {
    const range = user.numberOfWorkersRange;
    if (range === "0-10 workers") return 10000;
    if (range === "11-50 workers") return 45000;
    if (range === "51-100 workers") return 90000;
    if (range === "101-500 workers") return 350000;
    if (range === "500+ workers") return 600000;
  }
  return 2000; // Default base fee if something is missing
};

exports.getMyBills = asyncHandler(async (req, res) => {
  const now = new Date();

  // Find last successful payment
  const lastPaidBill = await Bill.findOne({
    userId: req.user._id,
    status: "paid",
  }).sort({ paidAt: -1 });

  console.log(lastPaidBill, "lastPaidBill");
  // Start counting from last payment or registration date
  const startDate = lastPaidBill
    ? new Date(lastPaidBill.paidAt)
    : new Date(req.user.createdAt);

  // Calculate months difference
  let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12;
  monthsDiff += now.getMonth() - startDate.getMonth();

  // Adjust if the current day of the month is less than the start day
  // (Meaning a full month has not yet elapsed for the final month)
  if (now.getDate() < startDate.getDate()) {
    monthsDiff--;
  }

  // Logic: 2 months and 3 days ago = 2 months charge.
  const outstandingMonths = Math.max(0, monthsDiff);
  const monthlyRate = calculateBillAmount(req.user);
  const totalAmount = outstandingMonths * monthlyRate;

  // Try to find an existing unpaid bill
  let currentBill = await Bill.findOne({
    userId: req.user._id,
    status: "unpaid",
  });

  if (totalAmount > 0) {
    if (!currentBill) {
      currentBill = await Bill.create({
        userId: req.user._id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        amount: totalAmount,
        status: "unpaid",
      });
    } else {
      // Update existing unpaid bill with new calculated amount and period
      currentBill.amount = totalAmount;
      currentBill.month = now.getMonth() + 1;
      currentBill.year = now.getFullYear();
      await currentBill.save();
    }
  } else if (currentBill) {
    // If debt was cleared or somehow is 0 now but an unpaid bill exists, remove it
    await Bill.deleteOne({ _id: currentBill._id });
  }

  const bills = await Bill.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({
    success: true,
    data: bills,
  });
});

exports.payBill = asyncHandler(async (req, res) => {
  const { billId } = req.body;

  const bill = await Bill.findOne({ _id: billId, userId: req.user._id });
  if (!bill) {
    return res.status(404).json({ success: false, message: "Bill not found" });
  }

  if (bill.status === "paid") {
    return res
      .status(400)
      .json({ success: false, message: "Bill is already paid" });
  }

  const metadata = {
    type: "monthly_bill",
    billId: bill._id,
    userId: req.user._id,
  };

  const paymentData = await paystackService.initializeTransaction(
    req.user.email,
    bill.amount,
    metadata,
  );

  res.json({
    success: true,
    message: "Payment initialized",
    data: {
      authorizationUrl: paymentData.data.authorization_url,
      reference: paymentData.data.reference,
    },
  });
});

exports.verifyWebhook = asyncHandler(async (req, res) => {
  // Validate signature
  const isValid = paystackService.validateWebhookSignature(req);
  if (!isValid) {
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body);

  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;

    if (
      metadata &&
      (metadata.type === "monthly_bill" || metadata.type === "annual_bill")
    ) {
      const bill = await Bill.findById(metadata.billId);
      if (bill && bill.status !== "paid") {
        // Verify from Paystack to be absolutely sure
        const verification = await paystackService.verifyTransaction(reference);
        if (verification.data.status === "success") {
          bill.status = "paid";
          bill.paystackReference = reference;
          bill.paidAt = new Date();
          await bill.save();
        }
      }
    } else if (metadata && metadata.type === "pickup_fee") {
      const PickupRequest = require("../models/PickupRequest");
      const pickup = await PickupRequest.findById(metadata.pickupId);
      if (pickup && pickup.paymentStatus !== "paid") {
        const verification = await paystackService.verifyTransaction(reference);
        if (verification.data.status === "success") {
          pickup.paymentStatus = "paid";
          pickup.paystackReference = reference;
          await pickup.save();
        }
      }
    }
  }

  res.sendStatus(200);
});
