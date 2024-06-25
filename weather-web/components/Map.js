import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Map = ({ onLocationClick }) => {
  const [marker, setMarker] = useState(null);

  // Create a custom icon using SVG
  const customIcon = useMemo(
    () =>
      new L.DivIcon({
        html: `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/>
          </svg>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        setMarker(e.latlng);
        onLocationClick(e.latlng);
      },
    });
    return null;
  };

  return (
    <MapContainer
      center={[30, -40]}  // Centered more on the Atlantic Ocean
      zoom={3}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Base map layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {/* OpenSeaMap layer */}
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
      />
      <MapEvents />
      {marker && <Marker position={marker} icon={customIcon} />}
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
};

export default Map;