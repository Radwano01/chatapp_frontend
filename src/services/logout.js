import api from "./api";
import { disconnectSocket } from "./socket";
import { ENV_CONFIG } from "../config/environment";

/**
 * Utility function to handle user logout
 * Can be called from anywhere in the application
 */
export const logoutUser = async () => {
  try {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    
    if (currentUser?.token) {
      // Call logout API endpoint
      await api.post(
        `/users/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );
    }
  } catch (error) {
    // Silently handle errors - logout should proceed even if API call fails
  } finally {
    // Always clean up local state
    disconnectSocket();
    sessionStorage.removeItem("currentUser");
    
    // Redirect to login page
    window.location.href = "/login";
  }
};

/**
 * Set up automatic logout when user exits the website
 * Should be called once when the app initializes
 */
export const setupAutoLogout = () => {
  const handleBeforeUnload = async (event) => {
    // Only logout if user is actually logged in
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    if (currentUser?.token) {
      // Use sendBeacon for reliable logout even if page is closing
      try {
        const logoutData = JSON.stringify({});
        const logoutUrl = `${ENV_CONFIG.FULL_API_URL}/users/logout`;
        navigator.sendBeacon(
          logoutUrl,
          new Blob([logoutData], { type: 'application/json' })
        );
      } catch (error) {
        // Silently handle sendBeacon errors
      }
      
      // Also clean up local state
      disconnectSocket();
      sessionStorage.removeItem("currentUser");
    }
  };

  // Add event listener for page unload
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};
