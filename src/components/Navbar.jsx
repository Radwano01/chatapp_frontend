import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { disconnectSocket } from "../services/socket";
import ImagePreviewModal from "./ImagePreviewModal";

export default function Navbar({ currentUser }) {
  const [showProfile, setShowProfile] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation(); // for active page highlight

  const handleLogout = async () => {
    try {
      if (currentUser?.token) {
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
    } finally {
      // Disconnect socket before logout
      disconnectSocket();
      sessionStorage.removeItem("currentUser");
      navigate("/login");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) {
    return (
      <div className="bg-white shadow p-4 flex justify-between items-center h-16">
        <div
          onClick={() => navigate("/", { replace: true })}
          className="font-bold text-xl text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
        >
          ChatApp
        </div>
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 text-white px-3 py-1"
        >
          Login
        </button>
      </div>
    );
  }

  const NavLink = ({ label, path, disabled }) => {
    const isActive = location.pathname === path;
    return (
      <div
        onClick={() => !disabled && navigate(path)}
        className={`
          flex items-center justify-center px-2 sm:px-6 h-full cursor-pointer transition-colors text-sm sm:text-base
          ${disabled ? "text-gray-400" : ""}
          ${!disabled ? "hover:bg-blue-600 hover:text-white" : ""}
          ${isActive ? "bg-blue-600 text-white font-bold" : "text-gray-700"}
        `}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="bg-white shadow flex justify-between items-center h-16 px-2 sm:px-4 relative">
      {/* Left: Navigation links with vertical dividers */}
      <div className="flex h-full">
        <div
          onClick={() => navigate("/", { replace: true })}
          className="flex items-center justify-center px-2 sm:px-6 h-full cursor-pointer transition-colors text-sm sm:text-base font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          ChatApp
        </div>
        <div className="border-l border-gray-300 h-full hidden sm:block"></div>
        <NavLink label="Friends" path="/friends" />
        <div className="border-l border-gray-300 h-full hidden sm:block"></div>
      </div>

      {/* Right: Profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center space-x-2 focus:outline-none relative h-full"
        >
          <div className="relative">
            <img
              src={
                currentUser?.image || currentUser?.avatar
                  ? ((currentUser.image || currentUser.avatar).startsWith('http') 
                      ? (currentUser.image || currentUser.avatar)
                      : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${currentUser.image || currentUser.avatar}`)
                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
              }
              alt="profile"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
              onClick={(e) => {
                e.stopPropagation();
                const imageUrl = currentUser?.image || currentUser?.avatar
                  ? ((currentUser.image || currentUser.avatar).startsWith('http') 
                      ? (currentUser.image || currentUser.avatar)
                      : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${currentUser.image || currentUser.avatar}`)
                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg";
                setPreviewImage(imageUrl);
              }}
            />
            <span
              className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${
                currentUser?.status === "ONLINE"
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            ></span>
          </div>
          <span>{currentUser?.username}</span>
        </button>

        {showProfile && (
          <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white shadow-lg z-50 p-3 sm:p-4 flex flex-col space-y-2">
            <div className="text-center relative">
              <img
                src={
                  currentUser?.image || currentUser?.avatar
                    ? ((currentUser.image || currentUser.avatar).startsWith('http') 
                        ? (currentUser.image || currentUser.avatar)
                        : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${currentUser.image || currentUser.avatar}`)
                    : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
                }
                alt="profile"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover mx-auto mb-2"
              />
              <span
                className={`absolute bottom-1 right-1 block w-3 h-3 rounded-full border-2 border-white ${
                  currentUser?.status === "ONLINE"
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
              ></span>
              <div className="font-bold text-sm sm:text-base">{currentUser?.fullName}</div>
            </div>

            <button
              onClick={() => navigate(`/users/${currentUser?.id}/edit`)}
              className="bg-blue-600 text-white px-3 py-1 text-sm sm:text-base"
            >
              Edit Profile
            </button>

            <button
              onClick={() =>
                navigate(`/users/${currentUser?.id}/change-password`)
              }
              className="bg-yellow-500 text-white px-3 py-1 text-sm sm:text-base"
            >
              Change Password
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1 text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          alt="Profile Preview"
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
