'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Registration from '../components/Registration';
import PositionUpdater from '../components/PositionUpdater';
import moment from 'moment';
import CycloneInfo from '../components/CycloneInfo';

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
  const [userId, setUserId] = useState(typeof window !== 'undefined' ? localStorage.getItem('userId') : null);
  const [userPosition, setUserPosition] = useState(null);
  const [isCycloneInfoOpen, setIsCycloneInfoOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  useEffect(() => {
    // Function to update user position
    const updateUserPosition = (position) => {
      setUserPosition([position.coords.latitude, position.coords.longitude]);
    };

    // Watch user's position
    const watchId = navigator.geolocation.watchPosition(updateUserPosition);

    // Cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleLocationClick = async (latlng) => {
    setCoordinates(latlng);
    setLoading(true);
    setError(null);
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const url = `${baseUrl}/api/v1/point-forecast/${latlng.lat}/${latlng.lng}`;
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

  const formatExpirationTime = (expiresDate) => {
    const expires = moment(expiresDate);
    const now = moment();
    const diffHours = expires.diff(now, 'hours');
    
    if (diffHours < 0) {
      return `Expired ${Math.abs(diffHours)} hours ago`;
    } else if (diffHours === 0) {
      return `Expires in less than an hour`;
    } else {
      return `Expires in ${diffHours} hours`;
    }
  };

  const [cycloneInfo, setCycloneInfo] = useState(null);

  useEffect(() => {
    const fetchCycloneInfo = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const url = `${baseUrl}/api/v1/cyclone-data`;
        console.log("Fetching cyclone data from URL:", url);
        const response = await fetch(url);
        const data = await response.json();
        setCycloneInfo(data.rss.channel[0].item);
      } catch (error) {
        console.error('Error fetching cyclone info:', error);
      }
    };

    fetchCycloneInfo();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center sm:text-left">Weather Forecast</h1>
      
      <Registration />
      {userId && <PositionUpdater userId={userId} />}
      
      <button
        onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {isInstructionsOpen ? 'Hide Instructions' : 'Show Instructions'}
      </button>

      {isInstructionsOpen && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">NWS Marine Weather Analysis</h2>
          <p className="mb-2">
            This tool provides detailed marine weather forecasts based on specific locations you select. Only zones supported by the NWS will contain forecast.
          </p>
          <h3 className="font-semibold mt-3 mb-1">How to Use:</h3>
          <ol className="list-decimal list-inside">
            <li>Click on any point on the map below to select a location.</li>
            <li>The app will fetch the relevant weather forecast for that location.</li>
            <li>You`&apos;`ll receive forecasts for three zones: Coastal, Offshore, and High Seas (if available).</li>
            <li>An AI-generated analysis of the forecast will also be provided.</li>
            <li>Use the buttons below the map to switch between different forecast types.</li>
          </ol>
          <p className="mt-2">
            The forecasts are sourced from the National Weather Service (NWS) marine weather data.
          </p>
        </div>
      )}

      <div className="h-[300px] sm:h-[400px] w-full">
        <Map onLocationClick={handleLocationClick} userPosition={userPosition} />
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
      <button
        onClick={() => setIsCycloneInfoOpen(!isCycloneInfoOpen)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {isCycloneInfoOpen ? 'Hide Tropical Cyclone Data' : 'Show Tropical Cyclone Data'}
      </button>

      {isCycloneInfoOpen && <CycloneInfo />}
      {forecastAnalysis && forecast && (
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Forecast Analysis</h2>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Forecast Expiration Times:</h3>
            {Object.entries(forecast).map(([type, forecastData]) => (
              forecastData && (
                <p key={type} className="text-sm text-gray-600">
                  <span className="capitalize">{type.replace('_', ' ')}</span>: {formatExpirationTime(forecastData.expires)}
                </p>
              )
            ))}
          </div>
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