'use client';

import { useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
});

const ForecastType = {
  COASTAL: 'coastal',
  OFFSHORE: 'offshore',
  HIGH_SEAS: 'high_seas'
};

const Home = () => {
  const [forecast, setForecast] = useState(null);
  const [forecastAnalysis, setForecastAnalysis] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeForecastType, setActiveForecastType] = useState(ForecastType.COASTAL);

  const handleLocationClick = async (latlng) => {
    setCoordinates(latlng);
    setLoading(true);
    setError(null);
    const baseUrl = "http://207.5.194.71:8080"; // Hardcoded as environment variable is not populating
    const url = `${baseUrl}/v1/point-forecast/${latlng.lat}/${latlng.lng}`;
    try {
      const response = await axios.get(url);
      setForecast(response.data.forecasts);
      setForecastAnalysis(response.data.forecastsAnalysis);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setForecast(null);
        setForecastAnalysis(null);
        setError("No forecast available for the selected location.");
      } else {
        console.error("Failed to fetch forecast:", error);
        setError("An error occurred while fetching the forecast. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center sm:text-left">Weather Forecast</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">NWS Marine Weather Analysis</h2>
        <p className="mb-2">
          This tool provides detailed marine weather forecasts based on specific locations you select. Only zones supported by the NWS will contain forecast.
        </p>
        <h3 className="font-semibold mt-3 mb-1">How to Use:</h3>
        <ol className="list-decimal list-inside">
          <li>Click on any point on the map below to select a location.</li>
          <li>The app will fetch the relevant weather forecast for that location.</li>
          <li>You&apos;ll receive forecasts for three zones: Coastal, Offshore, and High Seas (if available).</li>
          <li>An AI-generated analysis of the forecast will also be provided.</li>
          <li>Use the buttons below the map to switch between different forecast types.</li>
        </ol>
        <p className="mt-2">
          The forecasts are sourced from the National Weather Service (NWS) marine weather data.
        </p>
      </div>

      <div className="h-[300px] sm:h-[400px] w-full">
        <Map onLocationClick={handleLocationClick} />
      </div>
      
      {coordinates && (
        <p className="text-lg text-center sm:text-left">
          Selected coordinates: {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
        </p>
      )}
      {loading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {forecastAnalysis && (
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Forecast Analysis</h2>
          <p className="whitespace-pre-wrap">{forecastAnalysis}</p>
        </div>
      )}
      {forecast && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
            {Object.values(ForecastType).map((type) => 
              forecast[type] && (
                <button
                  key={type}
                  onClick={() => setActiveForecastType(type)}
                  className={`px-4 py-2 rounded-full ${
                    activeForecastType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              )
            )}
          </div>
          {forecast[activeForecastType] && (
            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2 capitalize">{activeForecastType.replace('_', ' ')} Forecast</h2>
              <pre className="whitespace-pre-wrap text-sm sm:text-base">{forecast[activeForecastType].forecast}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;