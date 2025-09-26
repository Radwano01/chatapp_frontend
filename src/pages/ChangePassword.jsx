import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // your axios instance

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "" });
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
    setNewPassword(password);
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "", requirements: [] });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (passwordStrength.score < 3) {
      setError("Password is too weak. Please include uppercase, lowercase, numbers, and special characters.");
      return;
    }

    try {
      await api.put(
        "/users/password",
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(sessionStorage.getItem("currentUser"))?.token
            }`,
          },
        }
      );

      setSuccess("Password updated successfully.");
      setError("");
      setTimeout(() => navigate("/users"), 1500); // redirect after success
    } catch (err) {
      setError("Failed to change password. Please try again.");
      setSuccess("");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleChangePassword}
        className="bg-white p-6 rounded shadow-md w-96"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Change Password</h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => handlePasswordChange(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
          required
        />

        {newPassword && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Password Strength:</span>
              <span className={`text-sm font-semibold ${
                passwordStrength.color === 'red' ? 'text-red-500' :
                passwordStrength.color === 'yellow' ? 'text-yellow-500' :
                passwordStrength.color === 'green' ? 'text-green-500' : 'text-gray-500'
              }`}>
                {passwordStrength.label}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  passwordStrength.color === 'red' ? 'bg-red-500' :
                  passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                  passwordStrength.color === 'green' ? 'bg-green-500' : 'bg-gray-300'
                }`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              ></div>
            </div>

            <div className="text-xs text-gray-600">
              {passwordStrength.requirements?.map((req, index) => (
                <div key={index} className={req.startsWith('✓') ? 'text-green-600' : 'text-red-500'}>
                  {req}
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
          required
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 text-white py-2 rounded"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
