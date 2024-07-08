import React from 'react';

const ButtonGroup = ({ 
  isInstructionsOpen, 
  setIsInstructionsOpen, 
  isCycloneInfoOpen, 
  setIsCycloneInfoOpen,
  isHurricaneDataOpen,
  setIsHurricaneInfoOpen
}) => {
  return (
    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">

      <button
        onClick={() => setIsCycloneInfoOpen(!isCycloneInfoOpen)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {isCycloneInfoOpen ? 'Hide Tropical Cyclone Data' : 'Show Tropical Cyclone Data'}
      </button>
      <button
        onClick={() => setIsHurricaneInfoOpen(!isHurricaneDataOpen)}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        {isHurricaneDataOpen ? 'Hide Hurricane Data' : 'Show Hurricane Data'}
      </button>
    </div>
  );
};

export default ButtonGroup;