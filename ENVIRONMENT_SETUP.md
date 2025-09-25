# Environment Setup for Chat Application

## WebSocket Connection Issues

If you're seeing WebSocket connection errors like:
- `WebSocket closed: {type: 'close', wasClean: false}`
- `STOMP not connected, queuing message`

This usually means the environment variables are not properly configured.

## Quick Fix

The application now has fallback configuration, but for best results, create a `.env` file in the root directory:

```bash
# Create .env file in the project root
touch .env
```

Add the following content to `.env`:

```env
# Backend API Configuration
REACT_APP_API_URL=http://localhost:8080
REACT_APP_API_PATH=/api
REACT_APP_WS_PATH=/ws
```

## Configuration Details

### Default Values (if no .env file)
- **API URL**: `http://localhost:8080`
- **API Path**: `/api`
- **WebSocket Path**: `/ws`

### Custom Backend Server
If your backend runs on a different port or domain, update the `.env` file:

```env
# Example for different port
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_PATH=/api
REACT_APP_WS_PATH=/ws

# Example for production server
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_API_PATH=/api
REACT_APP_WS_PATH=/ws
```

## Verification

After setting up the environment variables:

1. Restart your React development server:
   ```bash
   npm start
   ```

2. Check the browser console for configuration logs:
   - Look for "Environment Configuration:" log
   - Look for "WebSocket URL:" log
   - Look for "API Configuration:" log

3. The WebSocket should now connect successfully without the previous errors.

## Troubleshooting

### CORS Errors (Cross-Origin Resource Sharing)
If you see errors like:
```
Access to XMLHttpRequest at 'https://your-backend.ngrok-free.dev/ws/info' has been blocked by CORS policy
```

**Solution:** Your backend needs to allow CORS for your frontend domain. Add these headers to your backend CORS configuration:

```java
// For Spring Boot backend - CORRECT configuration
@CrossOrigin(origins = {
    "https://radwan-chatapp.netlify.app",
    "http://localhost:3000"
}, allowCredentials = "true")
```

Or for more general CORS configuration (matching your current setup):
```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("https://radwan-chatapp.netlify.app", "https://*.ngrok-free.dev")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }
}
```

### Still seeing connection errors?
1. Verify your backend server is running
2. Check that the WebSocket endpoint is accessible
3. Ensure CORS is properly configured on your backend
4. Check browser network tab for failed requests
5. For ngrok: Make sure to use the `--host-header=rewrite` flag

### Backend not running?
Make sure your backend server is running on the configured URL and port before starting the React app.

### Production Deployment
For production deployments (Netlify, Vercel, etc.), make sure to set the environment variables in your deployment platform's settings.
