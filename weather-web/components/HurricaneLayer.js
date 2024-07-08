import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const HurricaneLayer = ({ hurricaneShapefiles }) => {
  const map = useMap();

  useEffect(() => {
    if (!hurricaneShapefiles) return;

    const layers = Object.entries(hurricaneShapefiles).map(([name, data]) => {
      if (data.type !== 'FeatureCollection' || !data.features.length) return null;

      const feature = data.features[0];
      const { coordinates } = feature.geometry;
      const { STORMNAME, STORMTYPE, ADVISNUM } = feature.properties;

      // Create a polyline for the hurricane track
      const polyline = L.polyline(coordinates.map(coord => [coord[1], coord[0]]), {
        color: 'red',
        weight: 3,
        opacity: 0.7,
      }).addTo(map);

      // Add markers for each point on the track
      const markers = coordinates.map((coord, index) => {
        const isLastPoint = index === coordinates.length - 1;
        const markerColor = isLastPoint ? 'red' : 'blue';
        const markerSize = isLastPoint ? 10 : 6;

        return L.circleMarker([coord[1], coord[0]], {
          radius: markerSize,
          fillColor: markerColor,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map).bindPopup(`
          <b>${STORMNAME} (${STORMTYPE})</b><br>
          Advisory: ${ADVISNUM}<br>
          Position: ${coord[1].toFixed(2)}°N, ${coord[0].toFixed(2)}°W
        `);
      });

      // Fit the map to the hurricane track
      map.fitBounds(polyline.getBounds());

      return [polyline, ...markers];
    }).flat().filter(Boolean);

    return () => {
      layers.forEach(layer => map.removeLayer(layer));
    };
  }, [map, hurricaneShapefiles]);

  return null;
};

export default HurricaneLayer;