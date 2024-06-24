import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const Registration = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      setIsRegistered(true);
    }
  }, []);

  const detectDeviceType = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      ? 'mobile' 
      : 'web';
  };

  const setupWebPushNotifications = async (id) => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
        });
        await axios.post('/api/subscribe', { userId: id, subscription });
      } catch (error) {
        console.error('Web push notification setup failed:', error);
      }
    }
  };

  const setupMobilePushNotifications = async (id) => {
    // Implement mobile-specific push notification setup
    // This will depend on the mobile framework you're using (e.g., React Native)
    console.log('Mobile push notifications not yet implemented');
  };

  const startPeriodicPositionUpdates = (id) => {
    if ('geolocation' in navigator) {
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            await axios.post('/api/updatePosition', {
              userId: id,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          } catch (error) {
            console.error('Failed to update position:', error);
          }
        }, (error) => {
          console.error('Geolocation error:', error);
        });
      }, 15 * 60 * 1000); // Update every 15 minutes

      localStorage.setItem('positionUpdateIntervalId', intervalId.toString());
    }
  };

  const registerUser = async (id) => {
    try {
      const deviceType = detectDeviceType();
      await axios.post('/api/register', { userId: id, deviceType });
      
      if (deviceType === 'web') {
        await setupWebPushNotifications(id);
      } else {
        await setupMobilePushNotifications(id);
      }

      startPeriodicPositionUpdates(id);
      
      setIsRegistered(true);
      setUserId(id);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleRegister = async () => {
    const id = uuidv4();
    localStorage.setItem('userId', id);
    await registerUser(id);
    setShowModal(false);
    setShowConfirmation(true);
  };

  const handleUnregister = async () => {
    try {
      await axios.post('/api/unregister', { userId });
      localStorage.removeItem('userId');
      const intervalId = localStorage.getItem('positionUpdateIntervalId');
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        localStorage.removeItem('positionUpdateIntervalId');
      }
      setIsRegistered(false);
      setUserId(null);
    } catch (error) {
      console.error('Unregistration failed:', error);
    }
  };

  return (
    <div className="registration-component bg-blue-100 p-4 rounded-lg shadow-md mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-4 sm:mb-0 sm:mr-4 flex-grow">
          <h2 className="text-xl font-semibold mb-2">Weather Alert Registration</h2>
          <p className="text-gray-700">
            {isRegistered 
              ? "You are currently registered for personalized weather alerts."
              : "Register to receive personalized weather alerts for your location. Stay informed about severe weather conditions and ensure your safety on the water."}
          </p>
        </div>
        {!isRegistered ? (
          <button 
            className="register-button bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            onClick={() => setShowModal(true)}
          >
            Register for Alerts
          </button>
        ) : (
          <button 
            className="unregister-button bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            onClick={handleUnregister}
          >
            Unregister
          </button>
        )}
      </div>

      {/* ... (keep the modal and confirmation popup code as before) */}
    </div>
  );
};

export default Registration;