// components/CycloneInfo.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

const CycloneInfo = () => {
  const [cycloneData, setCycloneData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchCycloneData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await fetch(`${baseUrl}/cyclone-data`);
        const data = await response.json();
        setCycloneData(data);
      } catch (error) {
        console.error('Error fetching cyclone data:', error);
      }
    };

    fetchCycloneData();
  }, []);

  if (!cycloneData) {
    return <div>Loading cyclone data...</div>;
  }

  const renderOutlook = (outlook) => {
    const title = outlook.title[0];
    const description = outlook.description[0];
    const images = outlook.description[0].match(/<img.*?src="(.*?)".*?>/g);

    return (
      <div key={title} className="mb-4 bg-white shadow-md rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          {images && images.map((img, index) => {
            const src = img.match(/src="(.*?)"/)[1];
            return (
              <div key={index} className="relative h-32 cursor-pointer" onClick={() => setSelectedImage(src)}>
                <Image src={src} alt={`Outlook image ${index + 1}`} fill style={{objectFit: "contain"}} />
              </div>
            );
          })}
        </div>
        <div className="text-sm" dangerouslySetInnerHTML={{__html: description.replace(/<img.*?>/g, '')}} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tropical Cyclone Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cycloneData.rss.channel[0].item.map(renderOutlook)}
      </div>
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="max-w-4xl max-h-full p-4 relative w-full h-[80vh]">
            <Image src={selectedImage} alt="Full size image" fill style={{objectFit: "contain"}} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CycloneInfo;