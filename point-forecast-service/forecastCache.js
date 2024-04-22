// forecastCache.js

const cache = {};

function cacheForecast(zone, forecast) {
  let issuedAt = new Date();
  let expiresAt = new Date(issuedAt);
  expiresAt.setHours(expiresAt.getHours() + 6); // Default expiry time of 6 hours

  const issuedAtMatch = forecast.match(
    /(?<time>\d{4})\s+UTC\s+(?<dayOfWeek>\w{3})\s+(?<month>\w{3})\s+(?<day>\d{1,2})\s+(?<year>\d{4})/
  );

  if (issuedAtMatch) {
    const { time, dayOfWeek, month, day, year } = issuedAtMatch.groups;
    // Extract hours and minutes from the time string
    const [hours, minutes] = time.match(/(\d{2})(\d{2})/).slice(1);

    // Create a date string in a format recognized by Date.parse()
    const parsableDate = `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:00 UTC`;

    // Create a new Date object
    const issuedAt = new Date(Date.parse(parsableDate));
    
    expiresAt = new Date(issuedAt);
    expiresAt.setHours(expiresAt.getHours() + 6); // Default expiry time of 6 hours
  } else {
    console.log("Issue time not found in the forecast. Using current time as default.");
  }

  const expiresInMatch = forecast.match(/SUPERSEDED BY NEXT ISSUANCE IN (\d+) HOURS/);
  if (expiresInMatch) {
    const expiresInHours = parseInt(expiresInMatch[1]);
    expiresAt = new Date(issuedAt);
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  } else {
    const expiresAtMatch = forecast.match(/Expires:(\d{12})/);
    if (expiresAtMatch) {
      const expiresAtString = expiresAtMatch[1];
      const expiresAtYear = parseInt(expiresAtString.slice(0, 4));
      const expiresAtMonth = parseInt(expiresAtString.slice(4, 6)) - 1;
      const expiresAtDay = parseInt(expiresAtString.slice(6, 8));
      const expiresAtHour = parseInt(expiresAtString.slice(8, 10));
      const expiresAtMinute = parseInt(expiresAtString.slice(10, 12));
      expiresAt = new Date(Date.UTC(expiresAtYear, expiresAtMonth, expiresAtDay, expiresAtHour, expiresAtMinute));
    } else {
      console.log("Expiry time not found in the forecast. Using default expiry time of 6 hours.");
    }
  }

  if (!issuedAt || !expiresAt) {
    throw new Error(`issuedAt: ${issuedAt}, expiresAt: ${expiresAt}, forecast: ${forecast}`);
  }

  console.log(`Forecast for zone ${zone} was issued at ${issuedAt.toUTCString()}`);
  console.log(`Forecast for zone ${zone} will expire at ${expiresAt.toUTCString()}`);
  console.log(`ID for the forecast is ${zone}`);

  cache[zone] = {
    forecast,
    issuedAt,
    expiresAt,
  };

  console.log(`Forecast for zone ${zone} cached at ${issuedAt.toLocaleString()}`);
  console.log(`Forecast for zone ${zone} expires at ${expiresAt.toLocaleString()}`);

  // Schedule the removal of the forecast from the cache
  const timeUntilExpiry = expiresAt - issuedAt;
  setTimeout(() => removeForecastFromCache(zone), timeUntilExpiry);
}

function removeForecastFromCache(zone) {
  delete cache[zone];
  console.log(`Forecast for zone ${zone} removed from the cache`);
}

function getForecast(zone) {
  return cache[zone] ? cache[zone].forecast : null;
}

function getIssuedAt(zone) {
  return cache[zone] ? cache[zone].issuedAt : null;
}

function getExpiresAt(zone) {
  return cache[zone] ? cache[zone].expiresAt : null;
}

module.exports = {
  cacheForecast,
  getForecast,
  getIssuedAt,
  getExpiresAt,
};