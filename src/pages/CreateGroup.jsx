// src/pages/CreateGroup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { uploadToBackend, MESSAGE_TYPES } from "../services/upload";

export default function CreateGroup() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    let uploadedAvatarUrl = null;
    
    // Upload image to S3 if an image was selected
    if (image) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        const { filename } = await uploadToBackend(
          image,
          MESSAGE_TYPES.IMAGE,
          (progress) => setUploadProgress(progress)
        );
        uploadedAvatarUrl = filename;
      } catch (err) {
        console.error("Image upload failed:", err);
        alert("Failed to upload image. Please try again.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      setIsCreating(true);
      
      const payload = {
        name: groupName,
        description: description || null,
        avatar: uploadedAvatarUrl || null,
      };

      const token = currentUser?.token;

      await api.post("/groups", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      navigate("/");
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar currentUser={currentUser} />
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <form
          onSubmit={handleCreateGroup}
          className="bg-white p-6 rounded shadow-md w-80"
        >
          <h2 className="text-xl font-bold mb-4 text-center">Create Group</h2>

          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-3"
            required
          />

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-3"
          />

          {/* Image Upload Section */}
          <div className="mb-3">
            <label className="block text-gray-700 mb-2">Group Avatar (Optional)</label>
            
            {/* File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="w-full px-3 py-2 border rounded mb-2"
              disabled={isUploading || isCreating}
            />
            
            {/* Image Preview */}
            {image && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <img
                  src={URL.createObjectURL(image)}
                  alt="Group avatar preview"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
            )}
            
            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-3">
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

          <button
            type="submit"
            disabled={!groupName.trim() || isUploading || isCreating}
            className={`w-full py-2 rounded ${
              groupName.trim() && !isUploading && !isCreating
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }`}
          >
            {isUploading ? "Uploading..." : isCreating ? "Creating Group..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
}
