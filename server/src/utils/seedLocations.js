const LocalGovt = require("../models/LocalGovt");
const Ward = require("../models/Ward");
const PollingUnit = require("../models/PollingUnit");
const structuredData = require("../data/polling_units_structured.json");

/**
 * Seeds LocalGovernments, Wards, and PollingUnits from polling_units_structured.json
 * Safe and idempotent (uses upserts).
 * @param {boolean} force - If false, only seeds when LocalGovt count is 0.
 */
async function seedLocationsFromJson(force = false) {
  try {
    if (!force) {
      const existingCount = await LocalGovt.countDocuments();
      if (existingCount > 0) {
        return {
          seeded: false,
          message: "Locations already present in database.",
        };
      }
    }

    let lgasProcessed = 0;
    let wardsProcessed = 0;
    let pollingUnitsProcessed = 0;

    for (const [rawLgaName, wardsObj] of Object.entries(structuredData)) {
      const lgaName = (rawLgaName || "").trim();
      if (!lgaName) continue;

      const lgaDoc = await LocalGovt.findOneAndUpdate(
        { name: lgaName },
        { $setOnInsert: { name: lgaName, state: "Ondo", isActive: true } },
        { upsert: true, returnDocument: "after", new: true }
      );
      lgasProcessed++;

      for (const [rawWardName, units] of Object.entries(wardsObj || {})) {
        const wardName = (rawWardName || "").trim();
        if (!wardName || wardName === "Unknown Ward") continue;

        const wardDoc = await Ward.findOneAndUpdate(
          { localGovtId: lgaDoc._id, name: wardName },
          {
            $set: { localGovtName: lgaDoc.name },
            $setOnInsert: {
              name: wardName,
              localGovtId: lgaDoc._id,
              isActive: true,
            },
          },
          { upsert: true, returnDocument: "after", new: true }
        );
        wardsProcessed++;

        if (Array.isArray(units) && units.length > 0) {
          const seenNames = new Set();
          const bulkOps = [];

          for (const unit of units) {
            const puName = (unit?.name || "").trim();
            if (!puName) continue;
            const upperKey = puName.toUpperCase();
            if (seenNames.has(upperKey)) continue;
            seenNames.add(upperKey);

            const coords =
              Array.isArray(unit.coordinates) && unit.coordinates.length === 2
                ? [Number(unit.coordinates[0]), Number(unit.coordinates[1])]
                : [];

            bulkOps.push({
              updateOne: {
                filter: { wardId: wardDoc._id, name: puName },
                update: {
                  $set: {
                    localGovtId: lgaDoc._id,
                    localGovtName: lgaDoc.name,
                    wardName: wardDoc.name,
                    coordinates: coords,
                  },
                  $setOnInsert: {
                    name: puName,
                    wardId: wardDoc._id,
                    isActive: true,
                  },
                },
                upsert: true,
              },
            });
          }

          if (bulkOps.length > 0) {
            await PollingUnit.bulkWrite(bulkOps, { ordered: false });
            pollingUnitsProcessed += bulkOps.length;
          }
        }
      }
    }

    console.log(
      `[Locations Seed] Seeded ${lgasProcessed} LGAs, ${wardsProcessed} Wards, ${pollingUnitsProcessed} Polling Units.`
    );

    return {
      seeded: true,
      lgasProcessed,
      wardsProcessed,
      pollingUnitsProcessed,
    };
  } catch (error) {
    console.error("[Locations Seed] Error seeding locations:", error.message);
    throw error;
  }
}

module.exports = { seedLocationsFromJson };
