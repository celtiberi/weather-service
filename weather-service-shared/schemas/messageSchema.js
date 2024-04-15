const pointForecastRequestSchema = {
    type: 'object',
    properties: {
      lat: { type: 'number' },
      lon: { type: 'number' },
    },
    required: ['lat', 'lon'],
    additionalProperties: false,
  };
  
  const anotherMessageTypeSchema = {
    // Another schema definition
  };
  
  module.exports = {
    pointForecastRequestSchema,
    anotherMessageTypeSchema,
    // Export other schemas as needed
  };