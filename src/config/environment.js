// Environment configuration for the chat application
// You can modify these values to match your backend server configuration

export const ENV_CONFIG = {
  // Backend API URL (without trailing slash)
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  
  // API path prefix
  API_PATH: process.env.REACT_APP_API_PATH || '/api/v1',
  
  // WebSocket path
  WS_PATH: process.env.REACT_APP_WS_PATH || '/ws',
  
  // Full URLs
  get FULL_API_URL() {
    return `${this.API_URL}${this.API_PATH}`;
  },
  
  get FULL_WS_URL() {
    return `${this.API_URL}${this.WS_PATH}`;
  }
};

// Detect if running in production (Netlify)
const isProduction = window.location.hostname.includes('netlify.app') || 
                     window.location.hostname.includes('vercel.app') ||
                     process.env.NODE_ENV === 'production';

// Auto-detect ngrok URL if in production and no explicit config
if (isProduction && !process.env.REACT_APP_API_URL) {
  // Production environment without explicit API URL configuration
}

export default ENV_CONFIG;
