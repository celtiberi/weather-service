// forecast-analysis.js



const { connectToMongoDB } = require('../shared/module');
const { Anthropic } = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');

const fs = require('fs');

connectToMongoDB();


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

  logConnectionStatus();
  const zoneId = weatherForecast.coastal?.zoneId || weatherForecast.offshore?.zoneId || weatherForecast.high_seas?.zoneId;

  // Check for existing analysis
  const existingAnalysis = await ForecastAnalysis.findOne({ zoneId: zoneId });
  
  if (existingAnalysis && existingAnalysis.expiresAt > new Date()) {
    return existingAnalysis.analysis;
  }

  const availableZones = [];
  if (weatherForecast['coastal']) availableZones.push("coastal");
  if (weatherForecast['offshore']) availableZones.push("offshore");
  if (weatherForecast['high_seas']) availableZones.push("highseas");

  const systemPrompt = `
    As an experienced maritime weather analyst, provide a detailed forecast analysis for sailors based ONLY on the information given in the provided forecast.

    Important guidelines:
    1. Do not generate or infer information not explicitly provided in the input forecast.
    2. Reformat the information to improve readability, but maintain all specific details (wind speeds, directions, wave heights, etc.) exactly as given.
    3. Organize the forecast by time periods (Today, Tonight, and subsequent days) as presented in the original forecast.    
    4. Highlight any warnings, hazardous conditions, or significant weather events prominently. This includes, but is not limited to:
       - Tropical cyclones or potential tropical cyclones
       - Gale warnings
       - Storm warnings
       - Hurricane force wind warnings
       - High seas warnings
    5. Pay special attention to any mentions of developing systems, low pressure areas, or potential tropical cyclones. These should be emphasized in your analysis.

    Structure your analysis as follows:

    1. Available Forecasts:
       - List the available forecast zones: ${availableZones.join(", ")}. Only provide analysis for these zones.

    2. Significant Weather Events:
       - Immediately highlight any significant weather events or potential hazards mentioned in any of the forecasts.

    3. For each available forecast zone, provide:
       a. State the specific region or area covered by this forecast, if mentioned.
       b. A summary of the forecast, including any warnings or hazards.
       c. Today and tonight's forecast (if provided)
       d. Forecasts for subsequent days, organized day by day (as in the original forecast)

    4. General Outlook:
       - Summarize the overall weather pattern and trends based solely on the provided forecasts, considering all available zones.
       - Emphasize any developing systems or potential hazards that mariners should monitor.

    Remember: Only include information that is directly stated in the provided forecast. If certain details are not available, clearly state this rather than making assumptions.
  `;

  const userPrompt = `
    Analyze the following weather forecast for a mariner:
    ${JSON.stringify(weatherForecast, null, 2)}

    Provide a comprehensive analysis based on the given instructions, reformatting for clarity while maintaining all specific details from the original forecast. Remember to only analyze the following forecast zones: ${availableZones.join(", ")}.
  `;

  try {
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

    const forecastDocument = {
      zoneId: zoneId,
      analysis: analysis.content[0].text,
      expiresAt: new Date(smallestExpiration),
      createdAt: new Date()
    };

    try {
      // Use findOneAndUpdate to either update an existing document or create a new one
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

    console.log(analysis.content);
    return analysis.content[0].text;
  } catch (error) {
    console.error('Error analyzing weather forecast:', error);
    throw error;
  }
}

module.exports = {
  analyzeWeatherForecast,
};