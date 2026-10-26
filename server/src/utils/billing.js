const Bill = require("../models/Bill");

const calculateMonthlyTariff = (user) => {
  if (!user) return 3000;
  if (user.houseType === "Residential building") return 3000;
  if (user.houseType === "Shop") return 5000;
  if (user.houseType === "Company") {
    const range = user.numberOfWorkersRange;
    if (range === "0-10 workers") return 10000;
    if (range === "11-50 workers") return 45000;
    if (range === "51-100 workers") return 90000;
    if (range === "101-500 workers") return 350000;
    if (range === "500+ workers") return 600000;
  }
  return 3000;
};

const calculateOutstanding = (user, lastPaidBill) => {
  const now = new Date();
  const monthlyRate = calculateMonthlyTariff(user);

  const paidDate =
    lastPaidBill &&
    (lastPaidBill.paidAt || lastPaidBill.updatedAt || lastPaidBill.createdAt);

  const cycleStart = paidDate
    ? new Date(paidDate)
    : new Date((user && user.createdAt) || Date.now());

  let monthsDiff = (now.getFullYear() - cycleStart.getFullYear()) * 12;
  monthsDiff += now.getMonth() - cycleStart.getMonth();

  if (lastPaidBill) {
    // After a payment: only charge again once a new cycle starts in a different month
    if (monthsDiff > 0 && now.getDate() >= cycleStart.getDate()) {
      monthsDiff += 1;
    } else if (monthsDiff === 0) {
      monthsDiff = 0;
    }
  } else {
    // Never paid: always owes at least the initial billing cycle from registration
    if (now.getDate() >= cycleStart.getDate()) {
      monthsDiff += 1;
    }
    monthsDiff = Math.max(1, monthsDiff);
  }

  const outstandingMonths = Math.max(0, monthsDiff);
  const outstandingAmount = outstandingMonths * monthlyRate;

  return { monthlyRate, outstandingMonths, outstandingAmount };
};

const isResidentPaid = (user, lastPaidBill) => {
  if (!lastPaidBill || String(lastPaidBill.status).toLowerCase() !== "paid") {
    return false;
  }
  const { outstandingAmount } = calculateOutstanding(user, lastPaidBill);
  return outstandingAmount === 0;
};

const filterPaidResidents = async (residents) => {
  if (!Array.isArray(residents) || residents.length === 0) {
    return [];
  }

  const residentIds = residents.map((r) => r._id);
  const paidBills = await Bill.find({
    userId: { $in: residentIds },
    status: { $regex: /^paid$/i },
  }).sort({ paidAt: -1, createdAt: -1 });

  const latestPaidBillByUser = new Map();
  for (const bill of paidBills) {
    const uid = bill.userId.toString();
    if (!latestPaidBillByUser.has(uid)) {
      latestPaidBillByUser.set(uid, bill);
    }
  }

  return residents.filter((resident) => {
    const lastPaidBill = latestPaidBillByUser.get(resident._id.toString()) || null;
    return isResidentPaid(resident, lastPaidBill);
  });
};

module.exports = {
  calculateMonthlyTariff,
  calculateOutstanding,
  isResidentPaid,
  filterPaidResidents,
};
