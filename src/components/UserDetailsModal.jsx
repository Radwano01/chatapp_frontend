import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import ImagePreviewModal from "./ImagePreviewModal";

export default function UserDetailsModal({ user, currentUser, onClose, onSelectChat }) {
  const [localUser, setLocalUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  // Normalize relationStatus and maintain senderId
  useEffect(() => {
    if (!user) return;
    setLocalUser({
      ...user,
      otherUserId: user.otherUserId || user.id,
      relationStatus: user.relationStatus || "NONE",
      senderId: user.senderId || null,
      isSender: user.senderId === currentUser?.id,
      // Ensure avatar is properly set
      avatar: user.avatar || user.image || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
      fullName: user.fullName || user.username || "Unknown User",
      username: user.username || "unknown",
    });
  }, [user, currentUser]);

  const handleAddFriend = async () => {
    try {
      await api.post(`/friends/${localUser.otherUserId}`, null, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      setLocalUser(prev => ({
        ...prev,
        relationStatus: "PENDING",
        senderId: currentUser.id,
        isSender: true,
      }));
    } catch (err) {
      // Handle error silently
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await api.delete(`/friends/${localUser.otherUserId}`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      setLocalUser(prev => ({
        ...prev,
        relationStatus: "NONE",
        senderId: null,
        isSender: false,
      }));
    } catch (err) {
      // Handle error silently
    }
  };

  const handleChangeStatus = async (status) => {
    try {
      await api.put(`/friends/${localUser.otherUserId}?status=${status}`, null, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      setLocalUser(prev => ({
        ...prev,
        relationStatus: status,
        isSender: false,
        senderId: prev.senderId,
      }));
    } catch (err) {
      // Handle error silently
    }
  };

  const handleStartChat = async () => {
    try {
      const res = await api.post(`/chatrooms/users/${localUser.otherUserId}`, null, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      const chatId = res.data; // API now returns only chatId

      if (typeof onSelectChat === "function") {
        onSelectChat({
          id: localUser.otherUserId,
          chatId: chatId,
          members: [currentUser.id, localUser.otherUserId],
          username: localUser.username,
          fullName: localUser.fullName,
          avatar: localUser.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          description: localUser.description,
          status: localUser.status,
          relationStatus: localUser.relationStatus,
          senderId: localUser.senderId,
          uniqueKey: `DIRECT_${chatId}`,
        });
      }

      // Navigate to chat with the returned chatId
      navigate(`/chat/${chatId}`);
      onClose();
    } catch (err) {
      alert("Unable to start chat. Please try again.");
    }
  };

  const renderActions = () => {
    if (!localUser) return null;

    const status = localUser.relationStatus;

    // Always show Start Chat button
    const startChatButton = (
      <button
        onClick={handleStartChat}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        Start Chat
      </button>
    );

    if (status === "NONE") {
      return (
        <div className="flex flex-col gap-2 items-start">
          {startChatButton}
          <button
            onClick={handleAddFriend}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Add Friend
          </button>
        </div>
      );
    }

    if (status === "PENDING") {
      if (localUser.isSender) {
        return (
          <div className="flex flex-col gap-2 items-start">
            <span className="text-gray-500">Friend Request Sent</span>
            {startChatButton}
          </div>
        );
      } else {
        return (
          <div className="flex flex-col gap-2 items-start">
            <div className="flex gap-2">
              <button
                onClick={() => handleChangeStatus("ACCEPTED")}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Accept
              </button>
              <button
                onClick={() => handleChangeStatus("DECLINED")}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Decline
              </button>
            </div>
            {startChatButton}
          </div>
        );
      }
    }

    if (status === "ACCEPTED") {
      return (
        <div className="flex gap-2">
          {startChatButton}
          <button
            onClick={handleRemoveFriend}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Remove Friend
          </button>
        </div>
      );
    }

    // Default case - just show Start Chat button
    return startChatButton;
  };

  if (!localUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <div className="flex items-center space-x-3 mb-4">
          <img
            src={
              localUser.avatar 
                ? (localUser.avatar.startsWith('http') ? localUser.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/${localUser.avatar}`)
                : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
            }
            alt={localUser.fullName}
            className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition"
            onClick={() => {
              const imageUrl = localUser.avatar 
                ? (localUser.avatar.startsWith('http') ? localUser.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/${localUser.avatar}`)
                : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg";
              setPreviewImage(imageUrl);
            }}
          />
          <div>
            <h2 className="text-xl font-bold">{localUser.fullName}</h2>
            <p className="text-gray-600">@{localUser.username}</p>
            <p className="text-gray-500">{localUser.description || "No description"}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <span
            className={`text-sm font-semibold ${
              localUser.status === "ONLINE" ? "text-green-500" : "text-gray-400"
            }`}
          >
            {localUser.status || "OFFLINE"}
          </span>
          {renderActions()}
        </div>

        <button
          onClick={onClose}
          className="mt-6 bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          alt={localUser.fullName}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
