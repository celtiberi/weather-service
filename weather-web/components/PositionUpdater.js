// PositionUpdater.js
import { useEffect, useRef } from 'react';
import axios from 'axios';

const PositionUpdater = ({ userId }) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/update-position`, {
                userId,
                latitude,
                longitude
              });
              console.log(`Position updated successfully: Latitude ${latitude}, Longitude ${longitude}`);
            } catch (error) {
              console.error('Error updating position:', error);
            }
          },
          (error) => {
            console.error('Error getting position:', error.message);
          }
        );
      } else {
        console.log('Geolocation is not supported by this browser.');
      }
    };

    if (userId) {
      updatePosition(); // Update position immediately
      intervalRef.current = setInterval(updatePosition, 300000); // Update every 5 minutes
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);

  return null; // This component doesn't render anything
};

export default PositionUpdater;