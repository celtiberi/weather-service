// forecast-analysis.js

const { Anthropic } = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');

const fs = require('fs');


function getSecret(envVar) {
  const secretPath = process.env[envVar];
  if (secretPath && secretPath.startsWith('/run/secrets/')) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  return process.env[envVar];
}

const anthropicApiKey = getSecret('ANTHROPIC_API_KEY');
const client = new Anthropic({ apiKey: anthropicApiKey });


// Define Mongoose schema
const forecastAnalysisSchema = new mongoose.Schema({
  zoneId: String,
  analysis: String,
  expiresAt: Date,
  createdAt: Date
});

const ForecastAnalysis = mongoose.model('ForecastAnalysis', forecastAnalysisSchema);

function logConnectionStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  console.log(`Mongoose connection status: ${states[mongoose.connection.readyState]}`);
}

async function analyzeWeatherForecast(weatherForecast) {
  console.log("Starting weather forecast analysis.");
  logConnectionStatus();
  
  const zoneId = weatherForecast.coastal?.zoneId || weatherForecast.offshore?.zoneId || weatherForecast.high_seas?.zoneId;
  console.log(`Analyzing weather forecast for zone ID: ${zoneId}`);

  // Check for existing analysis
  const existingAnalysis = await ForecastAnalysis.findOne({ zoneId: zoneId });
  console.log(`Existing analysis found: ${!!existingAnalysis}`);

  if (existingAnalysis) {
    if (existingAnalysis.expiresAt > new Date()) {
      console.log("Returning existing analysis as it is still valid.");
      return existingAnalysis.analysis;
    } else {
      console.log("Existing analysis is not valid as it has expired.");
      console.log("Deleting expired analysis from the database.");
      await ForecastAnalysis.deleteOne({ zoneId: zoneId });
    }
  }

  const availableZones = [];
  if (weatherForecast['coastal']) availableZones.push("coastal");
  if (weatherForecast['offshore']) availableZones.push("offshore");
  if (weatherForecast['high_seas']) availableZones.push("highseas");
  console.log(`Available forecast zones: ${availableZones.join(", ")}`);

  const systemPrompt = `
    As an experienced maritime weather analyst, provide a detailed forecast analysis for sailors based ONLY on the information given in the provided forecast.
    ...
  `;

  const userPrompt = `
    Analyze the following weather forecast for a mariner:
    ${JSON.stringify(weatherForecast, null, 2)}
    ...
  `;

  try {
    console.log("Sending forecast data to Anthropic AI for analysis.");
    const analysis = await client.messages.create({
      max_tokens: 1500,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      model: 'claude-3-haiku-20240307',
    });

    const smallestExpiration = Math.min(
      ...['coastal', 'offshore', 'high_seas']
        .filter(zone => weatherForecast[zone])
        .map(zone => new Date(weatherForecast[zone].expires).getTime())
    );
    console.log(`Smallest expiration time: ${new Date(smallestExpiration).toISOString()}`);
    const forecastDocument = {
      zoneId: zoneId,
      analysis: analysis.content[0].text,
      expiresAt: new Date(smallestExpiration),
      createdAt: new Date()
    };

    try {
      console.log("Attempting to save or update forecast analysis in MongoDB.");
      await ForecastAnalysis.findOneAndUpdate(
        { zoneId: zoneId },
        forecastDocument,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log('Forecast analysis saved to MongoDB with zoneId and expiration time.');
    } catch (dbError) {
      console.error('Error saving forecast analysis to MongoDB:', dbError);
      throw dbError;
    }

    console.log("Analysis completed and saved.");
    return analysis.content[0].text;
  } catch (error) {
    console.error('Error analyzing weather forecast:', error);
    throw error;
  }
}

module.exports = {
  analyzeWeatherForecast,
};