import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 60000, // Set global timeout to 60 seconds
    maxContentLength: Infinity, // Increase max content length
    maxBodyLength: Infinity, // Increase max body length
  });

export default axiosInstance;