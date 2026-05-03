const axios = require('axios');

const osrmApi = axios.create({
  baseURL: 'https://router.project-osrm.org',
});

exports.getDistanceMatrix = async (coordinates) => {
  try {
    // OSRM coordinates format: {lng},{lat};{lng},{lat}
    const coordsString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
    
    // We want the distances (or durations) between all points
    // Table API returns durations by default
    const response = await osrmApi.get(`/table/v1/driving/${coordsString}`);
    
    return response.data.durations;
  } catch (error) {
    console.error('OSRM API Error:', error.message);
    throw new Error('Failed to get distance matrix from OSRM');
  }
};
