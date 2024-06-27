// next.config.mjs

const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'www.nhc.noaa.gov',
          port: '',
          pathname: '/xgtwo/**',
        },
      ],
    },
    // ... other existing configurations
  };
  
  export default nextConfig;