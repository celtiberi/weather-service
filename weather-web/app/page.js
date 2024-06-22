'use client';

import { useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
});

const Home = () => {
  const [forecast, setForecast] = useState(null);
  const [forecastAnalysis, setForecastAnalysis] = useState(null);

  const handleLocationClick = async (latlng) => {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/point-forecast/${latlng.lat}/${latlng.lng}`;
    try {
      const response = await axios.get(url);
      setForecast(response.data.forecasts);
      setForecastAnalysis(response.data.forecastsAnalysis);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setForecast(null);
        setForecastAnalysis("No forecast available for the selected location.");
      } else {
        console.error("Failed to fetch forecast:", error);
      }
    }
  };

  return (
    <div>
      <h1>Weather Forecast</h1>
      <Map onLocationClick={handleLocationClick} />
      {forecastAnalysis && (
        <div>
          <h2>Forecast Analysis</h2>
          <pre>{forecastAnalysis}</pre>
        </div>
      )}
      {forecast && (
        <div>
          {forecast.coastal && (
            <div>
              <h2>Coastal Forecast</h2>
              <pre>{forecast.coastal.forecast}</pre>
            </div>
          )}
          {forecast.offshore && (
            <div>
              <h2>Offshore Forecast</h2>
              <pre>{forecast.offshore.forecast}</pre>
            </div>
          )}
          {forecast.high_seas && (
            <div>
              <h2>High Seas Forecast</h2>
              <pre>{forecast.high_seas.forecast}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;