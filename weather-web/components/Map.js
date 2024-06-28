// components/Map.js

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, ScaleControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

const Map = ({ onLocationClick, userPosition }) => {
  const [marker, setMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState([30, -40]);
  const [cycloneShapefiles, setCycloneShapefiles] = useState(null);

  // Create a custom icon for click markers
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

  // Create a custom X icon for cyclone markers
  const cycloneIcon = L.divIcon({
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <line x1="4" y1="4" x2="20" y2="20" stroke="red" stroke-width="3"/>
        <line x1="20" y1="4" x2="4" y2="20" stroke="red" stroke-width="3"/>
      </svg>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Create a boat icon for user position
  const boatIcon = useMemo(
    () =>
      new L.DivIcon({
        html: `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z" fill="#f59e0b"/>
          </svg>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  useEffect(() => {
    const fetchCycloneData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const shapefilesResponse = await fetch(`${baseUrl}/cyclone-shapefiles`);
        const shapefilesData = await shapefilesResponse.json();
        setCycloneShapefiles(shapefilesData);
      } catch (error) {
        console.error('Error fetching cyclone data:', error);
      }
    };

    fetchCycloneData();
  }, []);

  const MapEvents = () => {
    const map = useMap();
    useMapEvents({
      click: (e) => {
        setMarker(e.latlng);
        onLocationClick(e.latlng);
      },
    });

    useEffect(() => {
      if (userPosition) {
        map.setView(userPosition, map.getZoom());
      }
    }, [userPosition, map]);

    return null;
  };

  const CycloneLayer = () => {
    const map = useMap();

    useEffect(() => {
      if (cycloneShapefiles) {
        const layers = Object.entries(cycloneShapefiles).map(([name, geoJsonData]) => {
          return L.geoJSON(geoJsonData, {
            style: (feature) => {
              let color = '#FF0000';  // Default color
              let weight = 2;
              let opacity = 0.7;

              if (feature.properties.RISK2DAY === 'High') {
                color = '#FF0000';  // Red for high risk
                weight = 3;
                opacity = 0.9;
              } else if (feature.properties.RISK2DAY === 'Medium') {
                color = '#FFA500';  // Orange for medium risk
              } else if (feature.properties.RISK2DAY === 'Low') {
                color = '#FFFF00';  // Yellow for low risk
              }

              return { color, weight, opacity };
            },
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: cycloneIcon });
            },
            onEachFeature: (feature, layer) => {
              if (feature.properties) {
                layer.bindPopup(`
                  <h3>Cyclone Information</h3>
                  <p>Area: ${feature.properties.AREA}</p>
                  <p>2-Day Probability: ${feature.properties.PROB2DAY}</p>
                  <p>2-Day Risk: ${feature.properties.RISK2DAY}</p>
                  <p>7-Day Probability: ${feature.properties.PROB7DAY}</p>
                  <p>7-Day Risk: ${feature.properties.RISK7DAY}</p>
                `);
              }
            }
          }).addTo(map);
        });

        return () => {
          layers.forEach(layer => map.removeLayer(layer));
        };
      }
    }, [map, cycloneShapefiles, cycloneIcon]);

    return null;
  };

  useEffect(() => {
    if (userPosition) {
      setMapCenter(userPosition);
    }
  }, [userPosition]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
      />
      <MapEvents />
      <CycloneLayer />
      {marker && <Marker position={marker} icon={customIcon} />}
      {userPosition && <Marker position={userPosition} icon={boatIcon} />}
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
};

export default Map;