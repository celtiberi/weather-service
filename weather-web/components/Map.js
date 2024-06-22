import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker } from 'react-leaflet';
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
      center={[40, -100]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapEvents />
      {marker && <Marker position={marker} icon={customIcon} />}
    </MapContainer>
  );
};

export default Map;