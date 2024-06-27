// components/CycloneInfo.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

const CycloneInfo = () => {
  const [cycloneData, setCycloneData] = useState(null);

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
      <div key={title} className="mb-8 bg-white shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {images && images.map((img, index) => {
            const src = img.match(/src="(.*?)"/)[1];
            return (
              <div key={index} className="relative h-64">
                <Image src={src} alt={`Outlook image ${index + 1}`} layout="fill" objectFit="contain" />
              </div>
            );
          })}
        </div>
        <div className="text-sm whitespace-pre-wrap"
             dangerouslySetInnerHTML={{__html: description.replace(/<img.*?>/g, '')}} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tropical Cyclone Information</h2>
      {cycloneData.rss.channel[0].item.map(renderOutlook)}
    </div>
  );
};

export default CycloneInfo;