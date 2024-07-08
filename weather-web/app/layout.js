import 'tailwindcss/tailwind.css';
import 'leaflet/dist/leaflet.css';
import Script from 'next/script';

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <title>Weather Forecast</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-polylinedecorator/1.6.0/leaflet.polylinedecorator.min.js"
          strategy="beforeInteractive"
        />
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-VWT52SCJCP"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VWT52SCJCP');
          `}
        </Script>
      </head>
      <body>
        <div className="container mx-auto py-4 px-4">{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;