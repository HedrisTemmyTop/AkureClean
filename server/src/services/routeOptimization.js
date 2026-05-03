exports.nearestNeighbor = (depot, households, distanceMatrix) => {
  // distanceMatrix is a (N+1) x (N+1) matrix where index 0 is the depot
  // and indices 1 to N are the households in order.
  
  const unvisited = new Set(households.map((_, i) => i + 1));
  const route = [];
  
  let currentPosIndex = 0; // Start at depot
  
  while (unvisited.size > 0) {
    let nearestIndex = -1;
    let shortestDistance = Infinity;
    
    for (const neighborIndex of unvisited) {
      const distance = distanceMatrix[currentPosIndex][neighborIndex];
      if (distance !== null && distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = neighborIndex;
      }
    }
    
    // If we can't reach any unvisited nodes (e.g. OSRM returned null), just pick the first unvisited
    if (nearestIndex === -1) {
      nearestIndex = unvisited.values().next().value;
    }
    
    route.push(households[nearestIndex - 1]);
    unvisited.delete(nearestIndex);
    currentPosIndex = nearestIndex;
  }
  
  return route;
};
