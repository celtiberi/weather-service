import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const HurricaneMap = ({ hurricaneName }) => {
  const [shapefileData, setShapefileData] = useState(null);

  useEffect(() => {
    const fetchShapefileData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await axios.get(`${baseUrl}/hurricane-shapefiles`);
        setShapefileData(response.data[hurricaneName]);
      } catch (error) {
        console.error('Error fetching shapefile data:', error);
      }
    };

    fetchShapefileData();
  }, [hurricaneName]);

  if (!shapefileData) {
    return <div>Loading map data...</div>;
  }

  return (
    <MapContainer center={[0, 0]} zoom={3} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {Object.entries(shapefileData).map(([layerName, geojson]) => (
        <GeoJSON 
          key={layerName} 
          data={geojson} 
          style={() => ({
            color: '#ff7800',
            weight: 5,
            opacity: 0.65
          })}
        />
      ))}
    </MapContainer>
  );
};

export default HurricaneMap;