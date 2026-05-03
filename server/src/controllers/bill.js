const Bill = require('../models/Bill');
const User = require('../models/User');
const paystackService = require('../services/paystack');
const asyncHandler = require('../utils/asyncHandler');

exports.getMyBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find({ userId: req.user._id }).sort({ year: -1 });
  res.json({
    success: true,
    data: bills
  });
});

exports.payBill = asyncHandler(async (req, res) => {
  const { billId } = req.body;

  const bill = await Bill.findOne({ _id: billId, userId: req.user._id });
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  if (bill.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Bill is already paid' });
  }

  const metadata = {
    type: 'annual_bill',
    billId: bill._id,
    userId: req.user._id
  };

  const paymentData = await paystackService.initializeTransaction(
    req.user.email,
    bill.amount,
    metadata
  );

  res.json({
    success: true,
    message: 'Payment initialized',
    data: {
      authorizationUrl: paymentData.data.authorization_url,
      reference: paymentData.data.reference
    }
  });
});

exports.verifyWebhook = asyncHandler(async (req, res) => {
  // Validate signature
  const isValid = paystackService.validateWebhookSignature(req);
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;

    if (metadata && metadata.type === 'annual_bill') {
      const bill = await Bill.findById(metadata.billId);
      if (bill && bill.status !== 'paid') {
        // Verify from Paystack to be absolutely sure
        const verification = await paystackService.verifyTransaction(reference);
        if (verification.data.status === 'success') {
          bill.status = 'paid';
          bill.paystackReference = reference;
          bill.paidAt = new Date();
          await bill.save();
        }
      }
    } else if (metadata && metadata.type === 'pickup_fee') {
      const PickupRequest = require('../models/PickupRequest');
      const pickup = await PickupRequest.findById(metadata.pickupId);
      if (pickup && pickup.paymentStatus !== 'paid') {
        const verification = await paystackService.verifyTransaction(reference);
        if (verification.data.status === 'success') {
          pickup.paymentStatus = 'paid';
          pickup.paystackReference = reference;
          await pickup.save();
        }
      }
    }
  }

  res.sendStatus(200);
});
