const turf = require('@turf/turf');
const nws = require('./nws');

// Function to calculate the distance and bearing between two points
function calculateDistanceAndBearing(point1, point2) {
  const from = turf.point([point1.lon, point1.lat]);
  const to = turf.point([point2.lon, point2.lat]);
  const distance = turf.distance(from, to, { units: 'nauticalmiles' });
  const bearing = turf.bearing(from, to);
  return { distance, bearing };
}

// Function to calculate the ETA at each waypoint
function calculateETA(waypoints, boatSpeed) {
  let totalDistance = 0;
  const etas = [0];

  for (let i = 1; i < waypoints.length; i++) {
    const { distance } = calculateDistanceAndBearing(waypoints[i - 1], waypoints[i]);
    totalDistance += distance;
    const etaHours = totalDistance / boatSpeed;
    etas.push(etaHours);
  }

  return etas;
}

// Function to determine the NWS zone for each waypoint
// TODO this should live in nws.js
function determineNWSZones(waypoints, nwsZonesShapefile) {
  const nwsZones = [];

  for (const waypoint of waypoints) {
    const point = turf.point([waypoint.lon, waypoint.lat]);
    const zone = nwsZonesShapefile.features.find(feature => turf.booleanPointInPolygon(point, feature));
    nwsZones.push(zone ? zone.properties.id : null);
  }

  return nwsZones;
}

// Function to simulate the boat's journey
// TODO just return the journet with the waypoints and etas.  Getting the forecast can be done in nws.js
//  maybe... just thinking that we shouldnt tie this code just to the forecast
function simulateBoatJourney(waypoints, startTime, boatSpeed, nwsZonesShapefile, nwsForecasts) {
  const etas = calculateETA(waypoints, boatSpeed);
  //const nwsZones = determineNWSZones(waypoints, nwsZonesShapefile);

  const journey = waypoints.map((waypoint, index) => ({
    waypoint,
    eta: startTime + etas[index] * 60 * 60 * 1000, // Convert hours to milliseconds
    //nwsZone: nwsZones[index]
  }));

  const relevantForecasts = {};

  for (const { eta, nwsZone } of journey) {
    if (nwsZone && !relevantForecasts[nwsZone]) {
      const forecast = nwsForecasts[nwsZone];
      const relevantParts = getRelevantForecastParts(forecast, eta);
      relevantForecasts[nwsZone] = relevantParts;
    }
  }

  return relevantForecasts;
}

// Function to get the relevant parts of the NWS forecast based on ETA
function getRelevantForecastParts(forecast, eta) {
  // Implement the logic to extract relevant parts of the forecast based on ETA
  // This will depend on the structure and format of the NWS forecast data
  // Return the relevant parts of the forecast
}

// Example usage
const waypoints = [
  { lat: 40.7128, lon: -74.0060 },
  { lat: 41.8781, lon: -87.6298 },
  // Add more waypoints...
];

const startTime = Date.now(); // Current timestamp
const boatSpeed = 4; // 4 knots
const nwsZonesShapefile = { /* Load the NWS zones shapefile data */ };
const nwsForecasts = { /* Load the NWS forecast data for each zone */ };

const relevantForecasts = simulateBoatJourney(waypoints, startTime, boatSpeed, nwsZonesShapefile, nwsForecasts);
console.log(relevantForecasts);