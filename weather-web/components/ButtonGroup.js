import React from 'react';

const ButtonGroup = ({ activeButton, setActiveButton }) => {
  const buttons = [
    { id: 'instructions', label: 'Instructions' },
    { id: 'cycloneInfo', label: 'Tropical Cyclone Data' },
    { id: 'hurricaneInfo', label: 'Hurricane Data' },
  ];

  return (
    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
      {buttons.map((button) => (
        <button
          key={button.id}
          onClick={() => setActiveButton(activeButton === button.id ? null : button.id)}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
            activeButton === button.id ? 'bg-blue-700' : ''
          }`}
        >
          {activeButton === button.id ? `Hide ${button.label}` : `Show ${button.label}`}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;