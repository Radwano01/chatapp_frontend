import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { connect } from "../services/socket";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const { data } = await api.post(`/users/login`, {
        username,
        password,
      });

      // Save user in sessionStorage
      sessionStorage.setItem("currentUser", JSON.stringify(data));

      // Start WebSocket connection with JWT
      connect(data.token, () => {
        // WebSocket connected after login
      });

      // Redirect to users page
      navigate("/users");
    } catch (err) {
      console.error("Login failed", err);
      const status = err?.response?.status;
      if (status === 401) {
        setError("Invalid username or password. Please try again.");
      } else if (status === 404) {
        setError("User not found. Please check your username.");
      } else if (status === 403) {
        setError("Account is disabled. Please contact support.");
      } else if (status >= 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-80"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 rounded mb-3 ${
            isLoading 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-blue-600 hover:underline"
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={() => navigate("/change-password")}
            className="text-yellow-600 hover:underline"
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}
