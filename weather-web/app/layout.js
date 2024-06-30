import 'tailwindcss/tailwind.css';
import 'leaflet/dist/leaflet.css';

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <title>Weather Forecast</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"
          async
        ></script>
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-polylinedecorator/1.6.0/leaflet.polylinedecorator.min.js"
          async
        ></script>
      </head>
      <body>
        <div className="container mx-auto py-4 px-4">{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;