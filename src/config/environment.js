// Environment configuration for the chat application
// You can modify these values to match your backend server configuration

export const ENV_CONFIG = {
  // Backend API URL (without trailing slash)
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  
  // API path prefix
  API_PATH: process.env.REACT_APP_API_PATH || '/api',
  
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

// Log configuration for debugging
console.log('Environment Configuration:', {
  API_URL: ENV_CONFIG.API_URL,
  API_PATH: ENV_CONFIG.API_PATH,
  WS_PATH: ENV_CONFIG.WS_PATH,
  FULL_API_URL: ENV_CONFIG.FULL_API_URL,
  FULL_WS_URL: ENV_CONFIG.FULL_WS_URL
});

export default ENV_CONFIG;
