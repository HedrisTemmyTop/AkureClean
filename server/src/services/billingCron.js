const cron = require('node-cron');
const User = require('../models/User');
const Bill = require('../models/Bill');

 const generateAnnualBills = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const BATCH_SIZE = 500;
    let processed = 0;
    let created = 0;

    const totalResidents = await User.countDocuments({ role: 'resident' });

    while (processed < totalResidents) {
      const residents = await User.find({ role: 'resident' })
        .skip(processed)
        .limit(BATCH_SIZE)
        .select('_id');

      const userIds = residents.map(r => r._id);

      // find who already has a bill this year in bulk
      const existingBills = await Bill.find({
        userId: { $in: userIds },
        year: currentYear
      }).select('userId');

      const existingUserIds = new Set(
        existingBills.map(b => b.userId.toString())
      );

      const newBills = userIds
        .filter(id => !existingUserIds.has(id.toString()))
        .map(id => ({
          userId: id,
          year: currentYear,
          amount: 5000,
          status: 'unpaid'
        }));

      if (newBills.length > 0) {
        await Bill.insertMany(newBills, { ordered: false });
        created += newBills.length;
      }

      processed += residents.length;
      console.log(`Processed ${processed}/${totalResidents} residents...`);
    }

    console.log(`Done. Created ${created} bills for ${currentYear}.`);
  } catch (error) {
    console.error('Error generating annual bills:', error);
  }
};

// Run on Jan 1st at 00:00 every year
cron.schedule('0 0 1 1 *', () => {
  generateAnnualBills();
});

module.exports = generateAnnualBills;


