// forecast-analysis.js
const { Anthropic } = require('@anthropic-ai/sdk');

const fs = require('fs');

// TODO getsecret needs to live in a shared location.  It will be all over the place
function getSecret(envVar) {
  const secretPath = process.env[envVar];
  if (secretPath && secretPath.startsWith('/run/secrets/')) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  return process.env[envVar];
}
const anthropicApiKey = getSecret('ANTHROPIC_API_KEY');
const client = new Anthropic({ apiKey: anthropicApiKey });

async function analyzeWeatherForecast(weatherForecast) {
  

  const systemPrompt = `
    You are an AI assistant tasked with analyzing weather forecasts for sailors. Your role is to interpret the forecast and provide a concise summary, focusing on the specific area where the boat is currently located.

    The forecast is organized into three levels: coastal, offshore, and high seas (arranged from smallest to largest area). The analysis should prioritize the smallest forecast that exists for the boat's current location. For example, if there is no coastal forecast but an offshore forecast exists, the boat is considered to be in the offshore zone.

    While focusing on the boat's current location, also consider the larger-scale forecasts (offshore and high seas) to provide the sailor with an understanding of the weather conditions that may affect them in the future.

    When analyzing the forecast, consider the following:
    - Wind speed and direction
      - Gale Warning: Sustained surface winds or frequent gusts in the range of 34-47 knots (39-54 mph)
      - Storm Warning: Sustained surface winds or frequent gusts in the range of 48-63 knots (55-73 mph)
      - Hurricane Force Wind Warning: Sustained winds or frequent gusts of 64 knots (74 mph) or greater
    - Wave height and sea state
      - Small Craft Advisory: Thresholds vary by region, but generally issued for winds 20-33 knots and/or seas greater than 4-10 feet, depending on the area
      - Hazardous Seas Warning: Wave heights and/or wave steepness values meeting or exceeding locally defined warning criteria
    - Presence of storms, squalls, or other severe weather
      - Special Marine Warning: Issued for potentially hazardous weather conditions usually of short duration (up to 2 hours) producing sustained marine thunderstorm winds or associated gusts of 34 knots or greater; and/or hail 3/4 inch or more in diameter; and/or waterspouts
    - Visibility and fog conditions
      - Dense Fog Advisory: Widespread or localized fog reducing visibilities to regionally or locally defined limitations not to exceed 1 nautical mile
    - Any other relevant information for safe navigation
      - Freezing Spray Advisory: Accumulation of freezing water droplets on a vessel at a rate of less than 2 cm per hour
      - Heavy Freezing Spray Warning: Accumulation of freezing water droplets on a vessel at a rate of 2 cm per hour or greater
      - Ashfall Advisory: Conditions associated with airborne ash plume resulting in ongoing deposition at the surface

    Format your analysis as follows:
    1. Summary: Give a summary of all of the weather broken into sections for coastal, offshore, and high_seas. Provide the predictions for the comins days.  This should contain all the essential information formatted in a way that is easy to read and understand.
    2. Dangers: A list of any dangerous weather conditions mentioned in the forecast for the boat's location, along with their expected timing and location.
    3. Outlook: A brief discussion of the larger-scale weather conditions (offshore and high seas) that may affect the sailor in the future.    
  `;

  const userPrompt = `
    Here is the weather forecast text:
    ${weatherForecast}

    Please provide your analysis based on the given instructions, focusing on the boat's current location and considering the larger-scale forecasts for future weather conditions.
  `;

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    //   model: 'claude-3-opus-20240229',
    model: 'claude-3-haiku-20240307',
    });

    console.log(message.content);

    return message.content[0].text;
  } catch (error) {
    console.error('Error analyzing weather forecast:', error);
    throw error;
  }
}

module.exports = {
  analyzeWeatherForecast,
};