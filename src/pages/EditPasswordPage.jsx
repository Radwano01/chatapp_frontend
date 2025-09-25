import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function EditPasswordPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const token = JSON.parse(sessionStorage.getItem("currentUser"))?.token;

      await api.put(
        `/users/password`,
        {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Password changed successfully!");
      navigate("/chat");
    } catch (err) {
          if (err.response) {
    alert(err.response.data?.message || "Failed to change password");
  } else {
    alert("Network or server error");
  }
    }
  };

  // Locker condition: all fields filled + passwords match
  const isValid =
    form.currentPassword.trim() &&
    form.newPassword.trim() &&
    form.confirmPassword.trim() &&
    form.newPassword === form.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-lg">

        <h1 className="text-2xl font-bold text-center mb-6">Change Password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid} // locker
              className={`px-4 py-2 rounded text-white ${isValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
                }`}
            >
              Save Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}