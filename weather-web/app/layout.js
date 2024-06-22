import 'tailwindcss/tailwind.css';
import 'leaflet/dist/leaflet.css';

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <title>Weather Forecast</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="container mx-auto py-4 px-4">{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;