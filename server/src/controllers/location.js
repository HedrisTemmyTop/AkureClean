const LocalGovt = require("../models/LocalGovt");
const Ward = require("../models/Ward");
const PollingUnit = require("../models/PollingUnit");
const asyncHandler = require("../utils/asyncHandler");
const { logActivity } = require("../utils/logger");
const { seedLocationsFromJson } = require("../utils/seedLocations");

/**
 * Helper to parse a CSV line respecting quoted fields
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Helper to parse full CSV text into array of row objects
 */
function parseCsvText(csvText) {
  const lines = (csvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[\s_-]+/g, "")
  );

  // Check if first row looks like a header
  const knownHeaders = [
    "localgovt",
    "lga",
    "localgovernment",
    "ward",
    "wardname",
    "pollingunit",
    "pollingunitname",
    "pu",
    "name",
    "longitude",
    "lng",
    "lon",
    "latitude",
    "lat",
  ];
  const hasHeader = rawHeaders.some((h) => knownHeaders.includes(h));

  const startIndex = hasHeader ? 1 : 0;
  const rows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    if (hasHeader) {
      const rowObj = {};
      rawHeaders.forEach((h, idx) => {
        const val = cols[idx] !== undefined ? cols[idx] : "";
        if (["localgovt", "lga", "localgovernment"].includes(h)) {
          rowObj.localGovt = val;
        } else if (["ward", "wardname"].includes(h)) {
          rowObj.ward = val;
        } else if (
          ["pollingunit", "pollingunitname", "pu", "name"].includes(h)
        ) {
          rowObj.pollingUnit = val;
        } else if (["longitude", "lng", "lon"].includes(h)) {
          rowObj.longitude = val;
        } else if (["latitude", "lat"].includes(h)) {
          rowObj.latitude = val;
        }
      });
      rows.push(rowObj);
    } else {
      // Positional fallback: localGovt, ward, pollingUnit, longitude, latitude
      rows.push({
        localGovt: cols[0] || "",
        ward: cols[1] || "",
        pollingUnit: cols[2] || "",
        longitude: cols[3] || "",
        latitude: cols[4] || "",
      });
    }
  }

  return rows;
}

/**
 * @desc    Get structured locations map + hierarchy lists
 *          Auto-seeds from polling_units_structured.json if database is empty
 * @route   GET /api/locations/structured
 * @access  Public
 */
exports.getStructuredLocations = asyncHandler(async (req, res) => {
  let lgas = await LocalGovt.find({ isActive: { $ne: false } }).sort({
    name: 1,
  });

  if (lgas.length === 0) {
    await seedLocationsFromJson(true);
    lgas = await LocalGovt.find({ isActive: { $ne: false } }).sort({ name: 1 });
  }

  const [wards, pollingUnits] = await Promise.all([
    Ward.find({ isActive: { $ne: false } }).sort({ name: 1 }),
    PollingUnit.find({ isActive: { $ne: false } }).sort({ name: 1 }),
  ]);

  // Build nested structure: { [lgaName]: { [wardName]: [{ _id, name, coordinates }] } }
  const structured = {};

  for (const lga of lgas) {
    structured[lga.name] = {};
  }

  const wardMapById = new Map();
  for (const ward of wards) {
    wardMapById.set(String(ward._id), ward);
    const lgaName = ward.localGovtName;
    if (!structured[lgaName]) {
      structured[lgaName] = {};
    }
    if (!structured[lgaName][ward.name]) {
      structured[lgaName][ward.name] = [];
    }
  }

  for (const pu of pollingUnits) {
    const lgaName = pu.localGovtName;
    const wardName = pu.wardName;
    if (!structured[lgaName]) {
      structured[lgaName] = {};
    }
    if (!structured[lgaName][wardName]) {
      structured[lgaName][wardName] = [];
    }
    structured[lgaName][wardName].push({
      _id: pu._id,
      name: pu.name,
      coordinates:
        Array.isArray(pu.coordinates) && pu.coordinates.length === 2
          ? pu.coordinates
          : [],
    });
  }

  res.status(200).json({
    success: true,
    data: {
      structured,
      lgas,
      wards,
      pollingUnits,
      counts: {
        lgas: lgas.length,
        wards: wards.length,
        pollingUnits: pollingUnits.length,
      },
    },
  });
});

/**
 * @desc    Get all Local Governments
 * @route   GET /api/locations/lgas
 * @access  Public
 */
exports.getLocalGovts = asyncHandler(async (req, res) => {
  let lgas = await LocalGovt.find().sort({ name: 1 });
  if (lgas.length === 0) {
    await seedLocationsFromJson(true);
    lgas = await LocalGovt.find().sort({ name: 1 });
  }

  res.status(200).json({
    success: true,
    data: lgas,
  });
});

/**
 * @desc    Create a Local Government
 * @route   POST /api/locations/lgas
 * @access  Private (Admin)
 */
exports.createLocalGovt = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const state = (req.body.state || "Ondo").trim();

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Local Government name is required",
    });
  }

  const existing = await LocalGovt.findOne({
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Local Government "${existing.name}" already exists`,
    });
  }

  const lga = await LocalGovt.create({ name, state });

  await logActivity(
    req.user._id,
    "CREATE_LOCAL_GOVT",
    `Created Local Government: ${lga.name}`,
    { localGovtId: lga._id, name: lga.name }
  );

  res.status(201).json({
    success: true,
    message: "Local Government created successfully",
    data: lga,
  });
});

/**
 * @desc    Update a Local Government
 * @route   PUT /api/locations/lgas/:id
 * @access  Private (Admin)
 */
exports.updateLocalGovt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || "").trim();

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Local Government name is required",
    });
  }

  const lga = await LocalGovt.findById(id);
  if (!lga) {
    return res.status(404).json({
      success: false,
      message: "Local Government not found",
    });
  }

  lga.name = name;
  if (req.body.state) lga.state = req.body.state.trim();
  await lga.save();

  // Cascade name update to child Wards and PollingUnits
  await Promise.all([
    Ward.updateMany({ localGovtId: lga._id }, { $set: { localGovtName: name } }),
    PollingUnit.updateMany(
      { localGovtId: lga._id },
      { $set: { localGovtName: name } }
    ),
  ]);

  res.status(200).json({
    success: true,
    message: "Local Government updated successfully",
    data: lga,
  });
});

/**
 * @desc    Delete a Local Government (and its wards & polling units)
 * @route   DELETE /api/locations/lgas/:id
 * @access  Private (Admin)
 */
exports.deleteLocalGovt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lga = await LocalGovt.findById(id);
  if (!lga) {
    return res.status(404).json({
      success: false,
      message: "Local Government not found",
    });
  }

  await Promise.all([
    PollingUnit.deleteMany({ localGovtId: lga._id }),
    Ward.deleteMany({ localGovtId: lga._id }),
    LocalGovt.findByIdAndDelete(id),
  ]);

  await logActivity(
    req.user._id,
    "DELETE_LOCAL_GOVT",
    `Deleted Local Government: ${lga.name}`,
    { localGovtId: id, name: lga.name }
  );

  res.status(200).json({
    success: true,
    message: `Local Government "${lga.name}" and its wards/polling units deleted`,
  });
});

/**
 * @desc    Get Wards (optionally filtered by localGovtId or lga name)
 * @route   GET /api/locations/wards
 * @access  Public
 */
exports.getWards = asyncHandler(async (req, res) => {
  const { localGovtId, lga } = req.query;
  const filter = {};

  if (localGovtId) {
    filter.localGovtId = localGovtId;
  } else if (lga) {
    filter.localGovtName = new RegExp(
      `^${String(lga).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
  }

  const wards = await Ward.find(filter).sort({ name: 1 });
  res.status(200).json({
    success: true,
    data: wards,
  });
});

/**
 * @desc    Create a Ward
 * @route   POST /api/locations/wards
 * @access  Private (Admin)
 */
exports.createWard = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const { localGovtId, localGovtName } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Ward name is required",
    });
  }

  let lga = null;
  if (localGovtId) {
    lga = await LocalGovt.findById(localGovtId);
  } else if (localGovtName) {
    lga = await LocalGovt.findOne({
      name: new RegExp(
        `^${String(localGovtName).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    });
  }

  if (!lga) {
    return res.status(404).json({
      success: false,
      message: "Target Local Government not found",
    });
  }

  const existing = await Ward.findOne({
    localGovtId: lga._id,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Ward "${existing.name}" already exists in ${lga.name}`,
    });
  }

  const ward = await Ward.create({
    name,
    localGovtId: lga._id,
    localGovtName: lga.name,
  });

  await logActivity(
    req.user._id,
    "CREATE_WARD",
    `Created Ward "${ward.name}" under ${lga.name}`,
    { wardId: ward._id, name: ward.name, localGovt: lga.name }
  );

  res.status(201).json({
    success: true,
    message: "Ward created successfully",
    data: ward,
  });
});

/**
 * @desc    Update a Ward
 * @route   PUT /api/locations/wards/:id
 * @access  Private (Admin)
 */
exports.updateWard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || "").trim();

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Ward name is required",
    });
  }

  const ward = await Ward.findById(id);
  if (!ward) {
    return res.status(404).json({
      success: false,
      message: "Ward not found",
    });
  }

  ward.name = name;
  await ward.save();

  await PollingUnit.updateMany(
    { wardId: ward._id },
    { $set: { wardName: name } }
  );

  res.status(200).json({
    success: true,
    message: "Ward updated successfully",
    data: ward,
  });
});

/**
 * @desc    Delete a Ward (and its polling units)
 * @route   DELETE /api/locations/wards/:id
 * @access  Private (Admin)
 */
exports.deleteWard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ward = await Ward.findById(id);
  if (!ward) {
    return res.status(404).json({
      success: false,
      message: "Ward not found",
    });
  }

  await Promise.all([
    PollingUnit.deleteMany({ wardId: ward._id }),
    Ward.findByIdAndDelete(id),
  ]);

  await logActivity(
    req.user._id,
    "DELETE_WARD",
    `Deleted Ward "${ward.name}" from ${ward.localGovtName}`,
    { wardId: id, name: ward.name }
  );

  res.status(200).json({
    success: true,
    message: `Ward "${ward.name}" and its polling units deleted`,
  });
});

/**
 * @desc    Get Polling Units (filtered by localGovtId, wardId, lga, ward, search)
 * @route   GET /api/locations/polling-units
 * @access  Public
 */
exports.getPollingUnits = asyncHandler(async (req, res) => {
  const { localGovtId, wardId, lga, ward, search } = req.query;
  const filter = {};

  if (localGovtId) filter.localGovtId = localGovtId;
  if (wardId) filter.wardId = wardId;
  if (lga) {
    filter.localGovtName = new RegExp(
      `^${String(lga).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
  }
  if (ward) {
    filter.wardName = new RegExp(
      `^${String(ward).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
  }
  if (search) {
    filter.name = new RegExp(
      String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
  }

  const pollingUnits = await PollingUnit.find(filter).sort({ name: 1 });
  res.status(200).json({
    success: true,
    data: pollingUnits,
  });
});

/**
 * @desc    Create a Polling Unit
 * @route   POST /api/locations/polling-units
 * @access  Private (Admin)
 */
exports.createPollingUnit = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const { wardId, localGovtId, wardName, localGovtName, longitude, latitude, coordinates } =
    req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Polling Unit name is required",
    });
  }

  let wardDoc = null;
  if (wardId) {
    wardDoc = await Ward.findById(wardId);
  } else if (wardName && (localGovtId || localGovtName)) {
    const wardQuery = {
      name: new RegExp(
        `^${String(wardName).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    };
    if (localGovtId) {
      wardQuery.localGovtId = localGovtId;
    } else if (localGovtName) {
      wardQuery.localGovtName = new RegExp(
        `^${String(localGovtName).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    wardDoc = await Ward.findOne(wardQuery);
  }

  if (!wardDoc) {
    return res.status(404).json({
      success: false,
      message: "Target Ward not found",
    });
  }

  const existing = await PollingUnit.findOne({
    wardId: wardDoc._id,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Polling Unit "${existing.name}" already exists in ${wardDoc.name}`,
    });
  }

  let coords = [];
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const lng = parseFloat(coordinates[0]);
    const lat = parseFloat(coordinates[1]);
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      coords = [lng, lat];
    }
  } else if (
    longitude !== undefined &&
    longitude !== "" &&
    latitude !== undefined &&
    latitude !== ""
  ) {
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      coords = [lng, lat];
    }
  }

  const pu = await PollingUnit.create({
    name,
    wardId: wardDoc._id,
    localGovtId: wardDoc.localGovtId,
    wardName: wardDoc.name,
    localGovtName: wardDoc.localGovtName,
    coordinates: coords,
  });

  await logActivity(
    req.user._id,
    "CREATE_POLLING_UNIT",
    `Created Polling Unit "${pu.name}" in ${wardDoc.name} (${wardDoc.localGovtName})`,
    { pollingUnitId: pu._id, name: pu.name, ward: wardDoc.name }
  );

  res.status(201).json({
    success: true,
    message: "Polling Unit created successfully",
    data: pu,
  });
});

/**
 * @desc    Update a Polling Unit
 * @route   PUT /api/locations/polling-units/:id
 * @access  Private (Admin)
 */
exports.updatePollingUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, longitude, latitude, coordinates } = req.body;

  const pu = await PollingUnit.findById(id);
  if (!pu) {
    return res.status(404).json({
      success: false,
      message: "Polling Unit not found",
    });
  }

  if (name && name.trim()) {
    pu.name = name.trim();
  }

  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const lng = parseFloat(coordinates[0]);
    const lat = parseFloat(coordinates[1]);
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      pu.coordinates = [lng, lat];
    }
  } else if (
    longitude !== undefined &&
    longitude !== "" &&
    latitude !== undefined &&
    latitude !== ""
  ) {
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      pu.coordinates = [lng, lat];
    }
  }

  await pu.save();

  res.status(200).json({
    success: true,
    message: "Polling Unit updated successfully",
    data: pu,
  });
});

/**
 * @desc    Delete a Polling Unit
 * @route   DELETE /api/locations/polling-units/:id
 * @access  Private (Admin)
 */
exports.deletePollingUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pu = await PollingUnit.findByIdAndDelete(id);
  if (!pu) {
    return res.status(404).json({
      success: false,
      message: "Polling Unit not found",
    });
  }

  await logActivity(
    req.user._id,
    "DELETE_POLLING_UNIT",
    `Deleted Polling Unit "${pu.name}" from ${pu.wardName}`,
    { pollingUnitId: id, name: pu.name }
  );

  res.status(200).json({
    success: true,
    message: `Polling Unit "${pu.name}" deleted`,
  });
});

/**
 * @desc    Bulk upload Local Governments, Wards, and Polling Units from CSV
 * @route   POST /api/locations/bulk-upload
 * @access  Private (Admin)
 */
exports.bulkUploadLocations = asyncHandler(async (req, res) => {
  const { csvText, rows: bodyRows } = req.body;

  let rows = [];
  if (Array.isArray(bodyRows) && bodyRows.length > 0) {
    rows = bodyRows;
  } else if (typeof csvText === "string" && csvText.trim()) {
    rows = parseCsvText(csvText);
  } else {
    return res.status(400).json({
      success: false,
      message: "Please provide valid CSV content or rows to upload.",
    });
  }

  if (rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid rows found in the CSV data.",
    });
  }

  let lgasCreated = 0;
  let wardsCreated = 0;
  let pollingUnitsCreated = 0;
  let pollingUnitsUpdated = 0;
  const errors = [];

  // Cache existing LGAs and Wards in memory for fast bulk processing
  const allLgas = await LocalGovt.find();
  const lgaCache = new Map();
  for (const l of allLgas) {
    lgaCache.set(l.name.toLowerCase(), l);
  }

  const allWards = await Ward.find();
  const wardCache = new Map();
  for (const w of allWards) {
    wardCache.set(`${String(w.localGovtId)}:${w.name.toLowerCase()}`, w);
  }

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const lgaName = String(r.localGovt || r.lga || r.local_govt || "").trim();
    const wardName = String(r.ward || r.ward_name || "").trim();
    const puName = String(
      r.pollingUnit || r.polling_unit || r.name || ""
    ).trim();

    if (!lgaName) {
      errors.push(`Row ${idx + 1}: Missing Local Government name`);
      continue;
    }

    try {
      // 1. Ensure LocalGovt exists
      let lgaDoc = lgaCache.get(lgaName.toLowerCase());
      if (!lgaDoc) {
        lgaDoc = await LocalGovt.findOneAndUpdate(
          { name: lgaName },
          { $setOnInsert: { name: lgaName, state: "Ondo", isActive: true } },
          { upsert: true, returnDocument: "after", new: true }
        );
        lgaCache.set(lgaDoc.name.toLowerCase(), lgaDoc);
        lgasCreated++;
      }

      if (!wardName) continue;

      // 2. Ensure Ward exists
      const wardKey = `${String(lgaDoc._id)}:${wardName.toLowerCase()}`;
      let wardDoc = wardCache.get(wardKey);
      if (!wardDoc) {
        wardDoc = await Ward.findOneAndUpdate(
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
        wardCache.set(wardKey, wardDoc);
        wardsCreated++;
      }

      if (!puName) continue;

      // 3. Upsert Polling Unit
      const lng = parseFloat(r.longitude ?? r.lng ?? r.lon ?? "");
      const lat = parseFloat(r.latitude ?? r.lat ?? "");
      const coords =
        !Number.isNaN(lng) && !Number.isNaN(lat) ? [lng, lat] : undefined;

      const existingPu = await PollingUnit.findOne({
        wardId: wardDoc._id,
        name: puName,
      });

      if (existingPu) {
        if (coords) {
          existingPu.coordinates = coords;
          await existingPu.save();
        }
        pollingUnitsUpdated++;
      } else {
        await PollingUnit.create({
          name: puName,
          wardId: wardDoc._id,
          localGovtId: lgaDoc._id,
          wardName: wardDoc.name,
          localGovtName: lgaDoc.name,
          coordinates: coords || [],
          isActive: true,
        });
        pollingUnitsCreated++;
      }
    } catch (rowErr) {
      errors.push(`Row ${idx + 1}: ${rowErr.message}`);
    }
  }

  await logActivity(
    req.user._id,
    "BULK_UPLOAD_LOCATIONS",
    `Bulk uploaded locations (${rows.length} rows): +${lgasCreated} LGAs, +${wardsCreated} Wards, +${pollingUnitsCreated} Polling Units`,
    {
      totalRows: rows.length,
      lgasCreated,
      wardsCreated,
      pollingUnitsCreated,
      pollingUnitsUpdated,
    }
  );

  res.status(200).json({
    success: true,
    message: `Processed ${rows.length} rows: ${lgasCreated} new LGA(s), ${wardsCreated} new Ward(s), ${pollingUnitsCreated} new Polling Unit(s), ${pollingUnitsUpdated} updated.`,
    data: {
      totalRows: rows.length,
      lgasCreated,
      wardsCreated,
      pollingUnitsCreated,
      pollingUnitsUpdated,
      errors,
    },
  });
});

/**
 * @desc    Seed/Sync default Akure North & South locations from JSON file
 * @route   POST /api/locations/seed-defaults
 * @access  Private (Admin)
 */
exports.seedDefaultLocations = asyncHandler(async (req, res) => {
  const result = await seedLocationsFromJson(true);

  await logActivity(
    req.user._id,
    "SEED_DEFAULT_LOCATIONS",
    `Synced default locations from JSON: ${result.lgasProcessed} LGAs, ${result.wardsProcessed} Wards, ${result.pollingUnitsProcessed} Polling Units`,
    result
  );

  res.status(200).json({
    success: true,
    message: `Synced ${result.lgasProcessed} LGAs, ${result.wardsProcessed} Wards, and ${result.pollingUnitsProcessed} Polling Units.`,
    data: result,
  });
});
