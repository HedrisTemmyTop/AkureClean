require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

// Haversine distance function from assignment.js
const getHaversineDistance = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const lon1 = coords1[0],
    lat1 = coords1[1];
  const lon2 = coords2[0],
    lat2 = coords2[1];
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

// Nearest neighbor heuristic from assignment.js
const runNearestNeighbor = (depotCoords, residents) => {
  let unvisited = residents.map((r, idx) => idx);
  let optimizedRouteIndices = [];
  let currentIdx = -1;

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minCost = Infinity;

    for (let u of unvisited) {
      const coords1 =
        currentIdx === -1
          ? depotCoords
          : residents[currentIdx].location.coordinates;
      const coords2 = residents[u].location.coordinates;

      const cost = getHaversineDistance(coords1, coords2);

      if (cost < minCost) {
        minCost = cost;
        nearestIdx = u;
      }
    }

    optimizedRouteIndices.push(nearestIdx);
    unvisited = unvisited.filter((v) => v !== nearestIdx);
    currentIdx = nearestIdx;
  }
  return optimizedRouteIndices;
};

// Get exact route totals from OSRM (like step 6 in assignment.js)
const getOsrmRouteTotals = async (orderedCoords) => {
  const orderedCoordsString = orderedCoords
    .map((c) => `${c[0]},${c[1]}`)
    .join(";");
  const osrmRouteUrl = `http://router.project-osrm.org/route/v1/driving/${orderedCoordsString}`;

  try {
    const routeRes = await fetch(osrmRouteUrl);
    const routeData = await routeRes.json();
    if (
      routeData.code === "Ok" &&
      routeData.routes &&
      routeData.routes.length > 0
    ) {
      return {
        distanceKm: routeData.routes[0].distance / 1000,
        durationMin: routeData.routes[0].duration / 60,
        isFallback: false,
      };
    }
  } catch (err) {
    // Fallback to Haversine total if OSRM fails
  }

  // Haversine fallback exactly like assignment.js (it doesn't calculate duration, but we'll estimate 1 min per km for fallback)
  let totalDist = 0;
  for (let i = 0; i < orderedCoords.length - 1; i++) {
    totalDist += getHaversineDistance(orderedCoords[i], orderedCoords[i + 1]);
  }
  return {
    distanceKm: totalDist,
    durationMin: totalDist * 2,
    isFallback: true,
  };
};

// Evaluate a specific sample size
const evaluateSize = async (depotCoords, residents, size) => {
  const sample = residents.slice(0, size);

  // 1. Measure OSRM Matrix API latency
  const coordsList = [
    depotCoords,
    ...sample.map((r) => r.location.coordinates),
  ];
  const coordsString = coordsList.map((c) => `${c[0]},${c[1]}`).join(";");
  const osrmTableUrl = `http://router.project-osrm.org/table/v1/driving/${coordsString}?sources=0`;

  const startMatrixTime = Date.now();
  let matrixSuccess = false;
  try {
    const tableRes = await fetch(osrmTableUrl);
    if (tableRes.ok) matrixSuccess = true;
  } catch (e) {}
  const matrixLatency = Date.now() - startMatrixTime;

  // 2. Unoptimized Totals
  const unoptimizedCoords = [
    depotCoords,
    ...sample.map((r) => r.location.coordinates),
  ];
  const unoptimizedTotals = await getOsrmRouteTotals(unoptimizedCoords);

  // 3. Optimized Totals (using assignment.js nearest neighbor)
  const optimizedIndices = runNearestNeighbor(depotCoords, sample);
  const optimizedCoords = [
    depotCoords,
    ...optimizedIndices.map((idx) => sample[idx].location.coordinates),
  ];
  const optimizedTotals = await getOsrmRouteTotals(optimizedCoords);

  // 4. Calculations
  const distReduction =
    ((unoptimizedTotals.distanceKm - optimizedTotals.distanceKm) /
      unoptimizedTotals.distanceKm) *
    100;
  const durReduction =
    ((unoptimizedTotals.durationMin - optimizedTotals.durationMin) /
      unoptimizedTotals.durationMin) *
    100;

  const fallbackLabel =
    unoptimizedTotals.isFallback || optimizedTotals.isFallback
      ? " (Haversine fallback)"
      : "";

  console.log(` RESULTS FOR ${size} HOUSEHOLDS ${fallbackLabel}`);
  console.log(`======================================================`);
  console.log(
    `OSRM Matrix API Latency: ${matrixSuccess ? matrixLatency + " ms" : "Failed"}`,
  );
  console.log(`------------------------------------------------------`);
  console.log(`UNOPTIMIZED ROUTE (DB Insertion Order):`);
  console.log(
    `  Total Distance: ${unoptimizedTotals.distanceKm.toFixed(2)} km`,
  );
  console.log(
    `  Total Duration: ${unoptimizedTotals.durationMin.toFixed(2)} min`,
  );
  console.log(`------------------------------------------------------`);
  console.log(`OPTIMIZED ROUTE (Nearest-Neighbor Heuristic):`);
  console.log(`  Total Distance: ${optimizedTotals.distanceKm.toFixed(2)} km`);
  console.log(
    `  Total Duration: ${optimizedTotals.durationMin.toFixed(2)} min`,
  );
  console.log(`IMPROVEMENT:`);
  console.log(`  Distance Reduction: ${distReduction.toFixed(2)} %`);
  console.log(`  Duration Reduction: ${durReduction.toFixed(2)} %`);
};

const run = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/akure_clean",
    );

    // Fetch residents around FUTA Gate we just created
    const residents = await User.find({
      role: "resident",
      pollingUnit: "FUTA GATE",
      "location.type": "Point",
      "location.coordinates": { $size: 2 },
    });

    if (residents.length < 30) {
      console.log(
        `WARNING: Only found ${residents.length} residents. Sizes will be limited.`,
      );
    }

    // Set a generic depot point in Akure (e.g., Waste Management HQ or just near the area)
    // We'll use [5.18, 7.25] as a generic central Akure depot coordinates
    const depotCoords = [5.18, 7.25];

    const sizes = [5, 15, 30];
    for (const size of sizes) {
      if (residents.length >= size) {
        await evaluateSize(depotCoords, residents, size);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error evaluating optimization:", err);
    process.exit(1);
  }
};

run();
