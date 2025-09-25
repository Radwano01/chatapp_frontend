import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { connect } from "../services/socket";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PATH}/users/login`, {
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
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-80"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

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
          className="w-full bg-blue-600 text-white py-2 rounded mb-3"
        >
          Login
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
