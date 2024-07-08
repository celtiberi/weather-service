import React, { useState } from 'react';
import useAnalytics from '../hooks/useAnalytics';

const HurricaneInfo = ({ hurricaneInfo }) => {
  const [selectedHurricane, setSelectedHurricane] = useState(null);
  const { trackEvent } = useAnalytics();

  const handleHurricaneSelect = (name) => {
    setSelectedHurricane(name);
    // Track the event when a user selects a hurricane
    trackEvent('view_hurricane_details', 'engagement', name);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Hurricane Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Active Hurricanes</h3>
          <ul>
            {Object.entries(hurricaneInfo).map(([name, data]) => (
              <li key={name} className="mb-2">
                <button 
                  onClick={() => handleHurricaneSelect(name)}
                  className={`text-blue-500 hover:text-blue-700 ${selectedHurricane === name ? 'font-bold' : ''}`}
                >
                  {name} - {data.type}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {selectedHurricane && (
          <div className="col-span-2">
            <h3 className="text-xl font-semibold mb-2">{selectedHurricane} Details</h3>
            <p>Type: {hurricaneInfo[selectedHurricane].type}</p>
            {Object.entries(hurricaneInfo[selectedHurricane].details).map(([key, value]) => (
              <p key={key}>{key}: {value}</p>
            ))}
            <h4 className="font-semibold mt-4 mb-2">Products:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(hurricaneInfo[selectedHurricane].products).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 truncate"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HurricaneInfo;