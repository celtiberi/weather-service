import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const HurricaneLayer = ({ hurricaneShapefiles, hurricaneInfo }) => {
  const map = useMap();

  useEffect(() => {
    if (hurricaneShapefiles && hurricaneInfo) {
      const layers = Object.entries(hurricaneShapefiles).map(([name, data]) => {
        // Check if the data has a FeatureCollection
        if (data && data.features && Array.isArray(data.features)) {
          return L.geoJSON(data, {
            style: (feature) => {
              // You can customize the style based on feature properties
              return { color: '#FF0000', weight: 2, opacity: 0.7 };
            },
            onEachFeature: (feature, layer) => {
              if (feature.properties) {
                layer.bindPopup(`
                  <h3>${name}</h3>
                  <p>Type: ${feature.properties.STORMTYPE || 'N/A'}</p>
                  <p>Wind Speed: ${feature.properties.MAXWIND || 'N/A'} kt</p>
                  <p>Pressure: ${feature.properties.MSLP || 'N/A'} mb</p>
                `);
              }
            }
          }).addTo(map);
        } else if (data && data.type === "FeatureCollection") {
          // If the data is already a FeatureCollection, use it directly
          return L.geoJSON(data, {
            style: (feature) => {
              return { color: '#FF0000', weight: 2, opacity: 0.7 };
            },
            onEachFeature: (feature, layer) => {
              if (feature.properties) {
                layer.bindPopup(`
                  <h3>${name}</h3>
                  <p>RADII: ${feature.properties.RADII || 'N/A'}</p>
                  <p>STORMID: ${feature.properties.STORMID || 'N/A'}</p>
                  <p>VALIDTIME: ${feature.properties.VALIDTIME || 'N/A'}</p>
                `);
              }
            }
          }).addTo(map);
        } else {
          console.error('Invalid data structure for hurricane shapefile:', name);
          return null;
        }
      });

      return () => {
        layers.forEach(layer => layer && map.removeLayer(layer));
      };
    }
  }, [map, hurricaneShapefiles, hurricaneInfo]);

  return null;
};

export default HurricaneLayer;