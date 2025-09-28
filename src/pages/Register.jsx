import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "", requirements: [] });
  const navigate = useNavigate();

  const calculatePasswordStrength = (password) => {
    let score = 0;
    let requirements = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
      requirements.push("✓ At least 8 characters");
    } else {
      requirements.push("✗ At least 8 characters");
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
      requirements.push("✓ Uppercase letter");
    } else {
      requirements.push("✗ Uppercase letter");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
      requirements.push("✓ Lowercase letter");
    } else {
      requirements.push("✗ Lowercase letter");
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
      requirements.push("✓ Number");
    } else {
      requirements.push("✗ Number");
    }

    // Symbol check
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 1;
      requirements.push("✓ Special character");
    } else {
      requirements.push("✗ Special character");
    }

    let label, color;
    if (score <= 2) {
      label = "Weak";
      color = "red";
    } else if (score <= 3) {
      label = "Medium";
      color = "yellow";
    } else {
      label = "Strong";
      color = "green";
    }

    return { score, label, color, requirements };
  };

  const handlePasswordChange = (password) => {
    setPassword(password);
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "", requirements: [] });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    // Check password strength
    if (passwordStrength.score < 3) {
      setError("Password is too weak. Please include uppercase, lowercase, numbers, and special characters.");
      return;
    }

    try {
      const createDTO = { username, fullName, password };
      await api.post("/users/register", createDTO);

      // ✅ Instead of auto-login, just redirect to login page
      navigate("/login");
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.response?.data?.message || "Registration failed");
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleRegister} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Register</h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-3 py-2 mb-3 rounded">{error}</div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        <div className="mb-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
          {password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Password Strength:</span>
                <span className={`text-sm font-medium ${
                  passwordStrength.color === 'red' ? 'text-red-600' :
                  passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength.color === 'red' ? 'bg-red-500' :
                    passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                {passwordStrength.requirements.map((req, index) => (
                  <div key={index} className={req.startsWith('✓') ? 'text-green-600' : 'text-red-600'}>
                    {req}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Register
        </button>

        <p className="text-sm mt-3 text-center">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 cursor-pointer"
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
