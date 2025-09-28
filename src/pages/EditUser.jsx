import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { uploadToBackend, MESSAGE_TYPES } from "../services/upload";
import AvatarCropper from "../components/AvatarCropper";

export default function EditUser() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    fullName: "",
    description: "",
    image: null,
  });
  const [originalUser, setOriginalUser] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // Load current user details from backend
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = JSON.parse(sessionStorage.getItem("currentUser"))?.token;

        const res = await api.get("/users/details", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser({
          fullName: res.data.fullName || "",
          description: res.data.description || "",
          image: null,
        });
        setOriginalUser(res.data);

        // Keep the backend copy in sessionStorage with proper field mapping
        const storedUser = JSON.parse(sessionStorage.getItem("currentUser"));
        const updatedUserData = {
          ...storedUser,
          ...res.data,
          // Ensure avatar field is mapped to image field for consistency
          image: res.data.avatar || res.data.image || storedUser.image,
          // Keep the avatar field as well for other components that might use it
          avatar: res.data.avatar || res.data.image || storedUser.avatar
        };
        sessionStorage.setItem("currentUser", JSON.stringify(updatedUserData));
      } catch (err) {
        // Handle error silently
      }
    };

    fetchDetails();
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setShowCropper(true);
    }
  };

  const handleCrop = (croppedBlob) => {
    const croppedFile = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    setUser({ ...user, image: croppedFile });
    setShowCropper(false);
    setSelectedImageFile(null);
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setSelectedImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let uploadedImageUrl = null;
    
    // Upload image to S3 if a new image was selected
    if (user.image) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        
        
        const { filename } = await uploadToBackend(
          user.image,
          MESSAGE_TYPES.IMAGE,
          (progress) => setUploadProgress(progress)
        );
        uploadedImageUrl = filename;
      } catch (err) {
        alert("Failed to upload image. Please try again.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Prepare update data with correct field names for backend
    const updateData = {};
    if (user.fullName && user.fullName !== originalUser?.fullName) {
      updateData.fullName = user.fullName;
    }
    if (user.description && user.description !== originalUser?.description) {
      updateData.description = user.description;
    }
    if (uploadedImageUrl) {
      updateData.avatar = uploadedImageUrl; // Send as 'avatar' field, not 'image'
    }

    try {
      const token = JSON.parse(sessionStorage.getItem("currentUser"))?.token;

      const res = await api.put(`/users`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state & sessionStorage with fresh backend response
      setOriginalUser(res.data);
      
      // Get current user from session storage
      const currentStoredUser = JSON.parse(sessionStorage.getItem("currentUser"));
      
      // Prepare updated user data, ensuring avatar is mapped to image field
      const updatedUserData = {
        ...currentStoredUser,
        ...res.data,
        // Ensure avatar field is mapped to image field for consistency
        image: res.data.avatar || res.data.image || currentStoredUser.image,
        // Keep the avatar field as well for other components that might use it
        avatar: res.data.avatar || res.data.image || currentStoredUser.avatar
      };
      
      // Update session storage
      sessionStorage.setItem("currentUser", JSON.stringify(updatedUserData));

      navigate("/chat");
    } catch (err) {
      alert("Failed to update profile. Please try again.");
    }
  };

  // Check if there are changes
  const hasChanges =
    (user.fullName && user.fullName !== originalUser?.fullName) ||
    (user.description && user.description !== originalUser?.description) ||
    user.image;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-gray-700">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={user.fullName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700">Description</label>
            <textarea
              name="description"
              value={user.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border rounded"
            ></textarea>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-gray-700 mb-2">Profile Image</label>
            
            {/* Current Avatar Preview */}
            {originalUser?.image && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Current Avatar:</p>
                <img
                  src={originalUser.image.startsWith('http') ? originalUser.image : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${originalUser.image}`}
                  alt="Current avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
            )}
            
            {/* File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
              disabled={isUploading}
            />
            
            {/* New Image Preview */}
            {user.image && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">New Avatar Preview:</p>
                <img
                  src={URL.createObjectURL(user.image)}
                  alt="New avatar preview"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
            )}
            
            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-3">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Buttons */}
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
              disabled={!hasChanges || isUploading}
              className={`px-4 py-2 rounded text-white ${
                hasChanges && !isUploading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {isUploading ? "Uploading..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Avatar Cropper Modal */}
      {showCropper && selectedImageFile && (
        <AvatarCropper
          imageFile={selectedImageFile}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}
