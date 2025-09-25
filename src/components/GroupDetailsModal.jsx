import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ImagePreviewModal from "./ImagePreviewModal";

export default function GroupDetailsModal({ group, currentUser, onClose, onRemoveUser, onRefresh }) {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  
  if (!group) return null;

  const currentUserInGroup = group.members?.find((m) => m.id === currentUser.id);
  const currentUserRole = currentUserInGroup?.role || "USER";

  const isOwner = currentUserRole === "OWNER";
  const isAdmin = currentUserRole === "ADMIN";

  const handleRemove = async (userId) => {
    try {
      await onRemoveUser(group.id, userId);
      
      const updatedDetails = await fetchUpdatedDetails();
      
      onRefresh(updatedDetails);
    } catch (err) {
      console.error("Error in handleRemove:", err);
      alert("Failed to remove user from group");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await api.delete(`/groups/${group.id}/leave`);
      
      alert("Successfully left the group ✅");
      
      // Close the modal and refresh the parent component
      onClose();
      
      // Trigger a refresh in the parent component
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("Error leaving group:", err);
      alert("Failed to leave group");
    }
  };

  const fetchUpdatedDetails = async () => {
    try {
      const res = await api.get(`/groups/${group.id}/details`);
      const details = res.data;
      return {
        ...group,
        ...details,
        description: details.description ?? group.description ?? "",
        members: details.members ?? group.members ?? [],
        createdAt: details.createdAt ?? details.timestamp ?? group.createdAt ?? group.timestamp ?? null,
      };
    } catch (err) {
      console.error(err);
      return {
        ...group,
        description: group.description ?? "",
        members: group.members ?? [],
        createdAt: group.createdAt ?? group.timestamp ?? null,
      };
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await api.put(`/groups/${Number(group.id)}/users/${userId}/role?role=${newRole}`);
      const updatedDetails = await fetchUpdatedDetails();
      onRefresh(updatedDetails);
    } catch (err) {
      console.error(err);
      alert("Failed to change role ❌");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-[500px] max-w-[90vw] h-[600px] max-h-[85vh] rounded shadow-lg p-6 relative overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>

        {/* Group Header */}
        <div className="flex items-center mb-4 justify-between">
          <div className="flex items-center">
            <img
              src={
                group.avatar || group.image 
                  ? (group.avatar || group.image).startsWith('http') 
                    ? (group.avatar || group.image)
                    : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${group.avatar || group.image}`
                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png"
              }
              alt={group.name || "Group"}
              className="w-12 h-12 rounded mr-3 object-cover cursor-pointer hover:opacity-80 transition"
              onClick={() => {
                const imageUrl = group.avatar || group.image 
                  ? (group.avatar || group.image).startsWith('http') 
                    ? (group.avatar || group.image)
                    : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${group.avatar || group.image}`
                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png";
                setPreviewImage(imageUrl);
              }}
              onError={(e) => {
                console.error("Failed to load group image:", group.avatar || group.image);
                e.target.src = "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png";
              }}
            />
            <div>
              <h2 className="font-bold text-lg">{group.name || "Unnamed Group"}</h2>
              {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
              {(group.createdAt || group.timestamp) && (
                <p className="text-xs text-gray-400 mt-1">
                  Created: {new Date(group.createdAt || group.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {/* Edit Group button (OWNER only) */}
            {isOwner && (
              <button
                onClick={() => navigate(`/groups/${group.id}/edit`)}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition"
              >
                Edit Group
              </button>
            )}

            {/* Add Members button (OWNER only) */}
            {isOwner && (
              <button
                onClick={() => navigate(`/groups/${group.id}/add-members`)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
              >
                Add Members
              </button>
            )}
          </div>
        </div>

        {/* Members List */}
        <h3 className="font-semibold mb-2">Members</h3>
        <ul className="space-y-2">
          {(group.members || []).map((member) => {
            const memberRole = member.role;
            const isMemberOwner = memberRole === "OWNER";

            return (
              <li key={member.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src={member.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"}
                    alt={member.fullName}
                    className="w-8 h-8 rounded mr-2 cursor-pointer hover:opacity-80 transition"
                    onClick={() => {
                      const imageUrl = member.avatar 
                        ? (member.avatar.startsWith('http') ? member.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${member.avatar}`)
                        : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg";
                      setPreviewImage(imageUrl);
                    }}
                  />
                  <span>{member.fullName}</span>
                  <span className="ml-2 text-xs text-gray-500">{memberRole}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Remove buttons */}
                  {isOwner && member.id !== currentUser.id && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}

                  {/* Promote/Demote buttons */}
                  {!isMemberOwner && (
                    <>
                      {isOwner && memberRole === "USER" && (
                        <button
                          onClick={() => changeUserRole(member.id, "ADMIN")}
                          className="text-green-600 text-sm hover:underline"
                        >
                          Promote to Admin
                        </button>
                      )}
                      {isOwner && memberRole === "ADMIN" && (
                        <button
                          onClick={() => changeUserRole(member.id, "USER")}
                          className="text-yellow-600 text-sm hover:underline"
                        >
                          Demote to User
                        </button>
                      )}

                      {isAdmin && memberRole === "USER" && (
                        <button
                          onClick={() => changeUserRole(member.id, "ADMIN")}
                          className="text-green-600 text-sm hover:underline"
                        >
                          Promote to Admin
                        </button>
                      )}
                      {isAdmin && memberRole === "ADMIN" && (
                        <button
                          onClick={() => changeUserRole(member.id, "USER")}
                          className="text-yellow-600 text-sm hover:underline"
                        >
                          Demote to User
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Leave group button for current user */}
        {group.members?.some((m) => m.id === currentUser.id) && (
          <button
            onClick={handleLeaveGroup}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
          >
            Leave Group
          </button>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          alt={group.name || "Group"}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
