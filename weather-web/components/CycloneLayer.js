import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-polylinedecorator';

const createCycloneIcon = (color) => L.divIcon({
  html: `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="4" x2="20" y2="20" stroke="${color}" stroke-width="4"/>
      <line x1="20" y1="4" x2="4" y2="20" stroke="${color}" stroke-width="4"/>
    </svg>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const CycloneLayer = ({ cycloneShapefiles }) => {
  const map = useMap();

  useEffect(() => {
    if (cycloneShapefiles) {
      console.log('Cyclone shapefiles:', cycloneShapefiles);
      
      const layers = Object.entries(cycloneShapefiles).map(([name, geoJsonData]) => {
        console.log(`Processing shapefile: ${name}`);
        console.log(`Number of features: ${geoJsonData.features.length}`);
        
        return L.geoJSON(geoJsonData, {
          // Style each feature based on its properties
          style: (feature) => {
            let color = '#FFA500';  // Default color (orange)
            let weight = 2;
            let opacity = 0.7;
            let fillOpacity = 0.3;

            // Change style based on risk level
            if (feature.properties.RISK2DAY === 'High') {
              color = '#FF0000';  // Red for high risk
              weight = 3;
              opacity = 0.9;
              fillOpacity = 0.4;
            } else if (feature.properties.RISK2DAY === 'Medium') {
              color = '#FFA500';  // Orange for medium risk
            } else if (feature.properties.RISK2DAY === 'Low') {
              color = '#FFFF00';  // Yellow for low risk
            }

            console.log(`Feature ${feature.properties.AREA} - Risk: ${feature.properties.RISK2DAY}, Color: ${color}`);
            return { color, weight, opacity, fillOpacity, fillColor: color };
          },
          // Convert point features to markers with custom icons
          pointToLayer: (feature, latlng) => {
            let color = '#FFA500';  // Default color

            // Change icon color based on risk level
            if (feature.properties.RISK2DAY === 'High') {
              color = '#FF0000';  // Red for high risk
            } else if (feature.properties.RISK2DAY === 'Medium') {
              color = '#FFA500';  // Orange for medium risk
            } else if (feature.properties.RISK2DAY === 'Low') {
              color = '#FFFF00';  // Yellow for low risk
            }
            
            return L.marker(latlng, { icon: createCycloneIcon(color) });
          },
          // Bind popups and add additional markers for each feature
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              // Bind a popup with cyclone information
              layer.bindPopup(`
                <div style="font-family: Arial, sans-serif; font-size: 14px;">
                  <h3 style="margin: 0; font-size: 16px; color: #333;">Cyclone Information</h3>
                  <p style="margin: 4px 0;"><strong>Area:</strong> ${feature.properties.AREA}</p>
                  <p style="margin: 4px 0;"><strong>2-Day Probability:</strong> ${feature.properties.PROB2DAY}</p>
                  <p style="margin: 4px 0;"><strong>2-Day Risk:</strong> ${feature.properties.RISK2DAY}</p>
                  <p style="margin: 4px 0;"><strong>7-Day Probability:</strong> ${feature.properties.PROB7DAY}</p>
                  <p style="margin: 4px 0;"><strong>7-Day Risk:</strong> ${feature.properties.RISK7DAY}</p>
                </div>
              `);

              // Add cyclone name label if available
              if (feature.properties.CYCLONE_NAME) {
                const bounds = layer.getBounds();
                const center = bounds.getCenter();
                L.marker(center, {
                  icon: L.divIcon({
                    className: 'cyclone-name-label',
                    html: `<div style="background-color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;">${feature.properties.CYCLONE_NAME}</div>`,
                    iconSize: [100, 20],
                    iconAnchor: [50, 10]
                  })
                }).addTo(map);
              }
            }

            // // Add arrow from X to the forecasted area
            // if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            //   const bounds = layer.getBounds();
            //   const center = bounds.getCenter();
            //   const xPosition = feature.properties.X_POSITION ? 
            //     L.latLng(feature.properties.X_POSITION.lat, feature.properties.X_POSITION.lng) : 
            //     L.latLng(bounds.getSouthWest().lat, bounds.getWest());

            //   const arrow = L.polyline([xPosition, center], {
            //     color: '#000',
            //     weight: 2,
            //     opacity: 0.7,
            //     smoothFactor: 1,
            //   }).addTo(map);

            //   L.polylineDecorator(arrow, {
            //     patterns: [
            //       {offset: '100%', repeat: 0, symbol: L.Symbol.arrowHead({pixelSize: 15, polygon: false, pathOptions: {stroke: true}})}
            //     ]
            //   }).addTo(map);
            // }
          }
        }).addTo(map);
      });

      // Cleanup function to remove layers when component unmounts or cycloneShapefiles changes
      return () => {
        layers.forEach(layer => map.removeLayer(layer));
      };
    }
  }, [map, cycloneShapefiles]);

  return null;
};

export default CycloneLayer;