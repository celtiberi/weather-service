import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Map = ({ onLocationClick }) => {
  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        onLocationClick(e.latlng);
      },
    });
    return null;
  };

  return (
    <MapContainer
      center={[40, -100]}
      zoom={4}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapEvents />
    </MapContainer>
  );
};

export default Map;