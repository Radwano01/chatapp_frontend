import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { uploadToBackend, MESSAGE_TYPES, deleteFromS3 } from "../services/upload";

export default function EditGroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [originalData, setOriginalData] = useState({
    name: "",
    description: "",
    avatar: "",
  });
  const [groupData, setGroupData] = useState({
    name: "",
    description: "",
    avatar: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch group details
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await api.get(`/groups/${groupId}/details`);
        const data = {
          name: res.data.name || "",
          description: res.data.description || "",
          avatar: res.data.avatar || "",
        };
        setOriginalData(data);
        setGroupData(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load group details ❌");
      }
    };
    fetchGroup();
  }, [groupId]);

  // Track input changes
  const handleChange = (e) => {
    setGroupData({ ...groupData, [e.target.name]: e.target.value });
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setAvatarFile(e.target.files[0]);
  };

  // Check if anything changed
  const hasChanges =
    groupData.name !== originalData.name ||
    groupData.description !== originalData.description ||
    groupData.avatar !== originalData.avatar ||
    avatarFile;

  // Save changes
  const handleSubmit = async () => {
    if (!hasChanges) return;
    
    let uploadedAvatarUrl = null;
    
    // Upload avatar to S3 if a new file was selected
    if (avatarFile) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        
        // Delete old group avatar from S3 if it exists and is not a default image
        if (originalData?.avatar) {
          if (originalData.avatar && !originalData.avatar.includes('user-group.png')) {
            await deleteFromS3(originalData.avatar);
          }
        }
        
        const { filename } = await uploadToBackend(
          avatarFile,
          MESSAGE_TYPES.IMAGE,
          (progress) => setUploadProgress(progress)
        );
        uploadedAvatarUrl = filename;
      } catch (err) {
        console.error("Avatar upload failed:", err);
        alert("Failed to upload avatar. Please try again.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      setLoading(true);
      
      // Prepare update data
      const updateData = {
        name: groupData.name,
        description: groupData.description,
        avatar: uploadedAvatarUrl || groupData.avatar,
      };
      
      await api.put(`/groups/${groupId}`, updateData);
      alert("Group updated successfully ✅");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Failed to update group ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h1 className="text-xl font-bold mb-4 text-center">Edit Group</h1>

        <input
          name="name"
          type="text"
          placeholder="Group Name"
          value={groupData.name}
          onChange={handleChange}
          className="w-full p-2 mb-2 border rounded"
          disabled={loading}
        />

        <input
          name="description"
          type="text"
          placeholder="Description"
          value={groupData.description}
          onChange={handleChange}
          className="w-full p-2 mb-2 border rounded"
          disabled={loading}
        />

        {/* Avatar Upload Section */}
        <div>
          <label className="block text-gray-700 mb-2">Group Avatar</label>
          
          {/* Current Avatar Preview */}
          {originalData.avatar && (
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-2">Current Avatar:</p>
              <img
                src={originalData.avatar.startsWith('http') ? originalData.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${originalData.avatar}`}
                alt="Current group avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          )}
          
          {/* File Upload */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-2 mb-2 border rounded"
            disabled={loading || isUploading}
          />
          
          {/* New Avatar Preview */}
          {avatarFile && (
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-2">New Avatar Preview:</p>
              <img
                src={URL.createObjectURL(avatarFile)}
                alt="New group avatar preview"
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
          
          {/* Manual URL Input (Alternative) */}
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Or enter avatar URL manually:</p>
            <input
              name="avatar"
              type="text"
              placeholder="Avatar URL"
              value={groupData.avatar}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              disabled={loading || isUploading}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className={`w-full px-3 py-2 rounded text-white mb-2 ${
            hasChanges && !isUploading ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={loading || !hasChanges || isUploading}
        >
          {isUploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full px-3 py-2 rounded bg-gray-300 text-black hover:bg-gray-400"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
