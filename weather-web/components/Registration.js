// Registration.js
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

  const registerUser = async (id) => {
    try {
      const deviceType = 'web'; // Or implement device detection logic
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/register`, { userId: id, deviceType });
      setIsRegistered(true);
      setUserId(id);
      localStorage.setItem('userId', id);
    } catch (error) {
      console.error('Registration failed:', error);
      // Handle registration error (e.g., show error message to user)
    }
  };

  const handleRegister = async () => {
    const id = uuidv4();
    await registerUser(id);
    setShowModal(false);
    setShowConfirmation(true);
  };

  const handleUnregister = async () => {
    try {
      const unregisterUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/unregister`;
      await axios.post(unregisterUrl, { userId });
      completeUnregistration();
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('User not found on server, proceeding with client-side unregistration');
        completeUnregistration();
      } else {
        console.error('Unregistration failed:', error);
        // Handle other types of errors here (e.g., show error message to user)
      }
    }
  };

  const completeUnregistration = () => {
    localStorage.removeItem('userId');
    setIsRegistered(false);
    setUserId(null);
    setShowConfirmation(false);
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Registration</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to register for weather alerts?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  id="ok-btn"
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onClick={handleRegister}
                >
                  Register
                </button>
                <button
                  id="cancel-btn"
                  className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="confirmation-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Registration Successful</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  You have successfully registered for weather alerts.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  id="ok-btn"
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onClick={() => setShowConfirmation(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;