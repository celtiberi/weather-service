'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Registration from '../components/Registration';
import PositionUpdater from '../components/PositionUpdater';
import moment from 'moment';
import CycloneInfo from '../components/CycloneInfo';
import HurricaneInfo from '../components/HurricaneInfo';
import Image from 'next/image'; 
import ButtonGroup from '../components/ButtonGroup';
import axiosInstance from '../utils/axiosConfig'; 

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
  const [isHurricaneInfoOpen, setIsHurricaneInfoOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [cycloneShapefiles, setCycloneShapefiles] = useState(null);
  const [hurricaneShapefiles, setHurricaneShapefiles] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState({});
  const [hurricaneInfo, setHurricaneInfo] = useState(null);
  const [cycloneInfo, setCycloneInfo] = useState(null);
  const [hurricaneInfoError, setHurricaneInfoError] = useState(null);

  useEffect(() => {
    const fetchData = async (url, setStateFunction, errorMessage) => {
      try {
        const response = await axiosInstance.get(url);
        setStateFunction(response.data);
      } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        setDataError(prev => ({...prev, [url]: errorMessage}));
      }
    };
  
    const fetchAllData = async () => {
      setDataLoading(true);
      setDataError({});
  
      const dataFetches = [
        fetchData('/cyclone-data', (data) => setCycloneInfo(data.rss.channel[0].item), 'Failed to fetch cyclone data.'),
        fetchData('/cyclone-shapefiles', setCycloneShapefiles, 'Failed to fetch cyclone shapefiles.'),
        fetchData('/hurricane-info', setHurricaneInfo, 'Failed to fetch hurricane information.'),
        //fetchData('/hurricane-shapefiles', setHurricaneShapefiles, 'Failed to fetch hurricane shapefiles.')
      ];
  
      await Promise.all(dataFetches);
      setDataLoading(false);
    };
  
    fetchAllData();
  }, []);


  useEffect(() => {
    const updateUserPosition = (position) => {
      setUserPosition([position.coords.latitude, position.coords.longitude]);
    };

    const watchId = navigator.geolocation.watchPosition(updateUserPosition);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);


  const handleLocationClick = async (latlng) => {
    setCoordinates(latlng);
    setLoading(true);
    setError(null);
    const url = `/point-forecast?lat=${latlng.lat}&lon=${latlng.lng}`;
    try {
      const response = await axiosInstance.get(url, { timeout: 60000 });
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

  const closeModal = () => setSelectedImage(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center sm:text-left">Weather Forecast</h1>
      
      <ButtonGroup 
        isInstructionsOpen={isInstructionsOpen}
        setIsInstructionsOpen={setIsInstructionsOpen}
        isCycloneInfoOpen={isCycloneInfoOpen}
        setIsCycloneInfoOpen={setIsCycloneInfoOpen}
        isHurricaneInfoOpen={isHurricaneInfoOpen}
        setIsHurricaneInfoOpen={setIsHurricaneInfoOpen}
      />

      <Registration />
      {userId && <PositionUpdater userId={userId} />}
      
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
            <li>You will receive forecasts for three zones: Coastal, Offshore, and High Seas (if available).</li>
            <li>An AI-generated analysis of the forecast will also be provided.</li>
            <li>Use the buttons below the map to switch between different forecast types.</li>
          </ol>
          <p className="mt-2">
            The forecasts are sourced from the National Weather Service (NWS) marine weather data.
          </p>
        </div>
      )}

    

<div className="space-y-4">
  {Object.values(dataError).length > 0 && (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Errors:</strong>
      <ul className="mt-2 list-disc list-inside">
        {Object.values(dataError).map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  )}

  <div className="h-[300px] sm:h-[400px] w-full relative">
    {dataLoading && (
      <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-10">
        <div className="text-lg font-semibold">Loading map data...</div>
      </div>
    )}
    <Map 
      onLocationClick={handleLocationClick} 
      userPosition={userPosition}
      cycloneShapefiles={cycloneShapefiles}
      hurricaneShapefiles={hurricaneShapefiles}
      hurricaneInfo={hurricaneInfo}
    />
  </div>
</div>
      
      {isCycloneInfoOpen && <CycloneInfo setSelectedImage={setSelectedImage} />}
      {isHurricaneInfoOpen && (
        <div>
          <h2 className="text-xl font-bold mb-2">Hurricane Information</h2>
          {hurricaneInfoError ? (
            <div className="text-red-500">{hurricaneInfoError}</div>
          ) : hurricaneInfo ? (
            <HurricaneInfo hurricaneInfo={hurricaneInfo} />
          ) : (
            <div>Loading hurricane information...</div>
          )}
        </div>
      )}


      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000]" onClick={closeModal}>
          <div className="max-w-4xl max-h-[90vh] w-[90vw] p-4 relative bg-white rounded-lg" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-2 right-2 text-black text-xl font-bold z-10" 
              onClick={closeModal}
            >
              ×
            </button>
            <div className="relative w-full h-[calc(90vh-2rem)]">
              <Image 
                src={selectedImage}
                alt="Full size image"
                fill
                sizes="(max-width: 768px) 90vw, (max-width: 1200px) 80vw, 70vw"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}

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