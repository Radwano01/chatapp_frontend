import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import GroupDetailsModal from "./GroupDetailsModal";
import UserDetailsModal from "./UserDetailsModal";
import ImagePreviewModal from "./ImagePreviewModal";

export default function Sidebar({ currentUser, chatRooms = [], onSelectChat }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [localChats, setLocalChats] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const fetchedIdsRef = useRef(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  // Normalize incoming chatRooms into a consistent local shape
  useEffect(() => {
    const normalized = (Array.isArray(chatRooms) ? chatRooms : []).map((c) => {
      return {
        id: c.id,
        chatId: c.chatId,
        otherUserId: c.otherUserId,
        fullName: c.fullName,
        avatar: c.avatar 
          ? (c.avatar.startsWith('http') ? c.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${c.avatar}`)
          : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
        description: c.description,
        status: c.status,
        relationStatus: c.relationStatus,
        senderId: c.senderId,
        __raw: c,
      };
    });

    setLocalChats(normalized);
  }, [chatRooms, currentUser]);

  // If any chats are missing username/fullName, fetch the user details (only once per id)
  useEffect(() => {
    if (!currentUser) return;
    const idsToFetch = localChats
      .filter(
        (ch) =>
          ch.otherUserId &&
          !ch.username &&
          !ch.fullName &&
          !fetchedIdsRef.current.has(ch.otherUserId)
      )
      .map((ch) => ch.otherUserId);

    if (idsToFetch.length === 0) return;

    idsToFetch.forEach(async (id) => {
      fetchedIdsRef.current.add(id);
      try {
        const res = await api.get(`/users/${id}`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` },
        });
        const user = res.data;
        // Normalize user data to ensure fullName is available
        const normalizedUser = {
          ...user,
          fullName: user.fullName || user.username || "Unknown User",
          avatar: user.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
        };
        setLocalChats((prev) =>
          prev.map((pc) =>
            pc.otherUserId === id ? { ...pc, ...normalizedUser, otherUserId: pc.otherUserId } : pc
          )
        );
      } catch (err) {
        // Handle error silently
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localChats, currentUser]);

  // Handle selectedChat passed via navigate state
  useEffect(() => {
    const sel = location.state?.selectedChat;
    if (!sel) return;

    setLocalChats((prev) => {
      const exists = prev.some((c) => c.id === sel.id);
      if (exists) {
        return prev.map((c) => (c.id === sel.id ? { ...c, ...sel } : c));
      }
      return [...prev, sel];
    });

    onSelectChat(sel);

    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get(`/groups`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` },
        });
        setGroups(res.data || []);
      } catch (err) {
        // Handle error silently
      }
    };
    if (currentUser?.token) {
      fetchGroups();
    }
  }, [currentUser]);

  // When user clicks a chat in the list
  const handleClickChat = (chat) => {
    const selected = {
      id: chat.id,
      chatId: chat.chatId,
      otherUserId: chat.otherUserId,
      fullName: chat.fullName,
      avatar: chat.avatar 
        ? (chat.avatar.startsWith('http') ? chat.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${chat.avatar}`)
        : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
      description: chat.description,
      status: chat.status,
      relationStatus: chat.relationStatus,
      senderId: chat.senderId,
      __raw: chat.__raw,
    };
    onSelectChat(selected);
    // Navigate to the chat URL
    navigate(`/chat/${chat.chatId}`);
  };

  // View details button - use existing chat data instead of API call
  const openUserDetails = (chat) => {
    // Use existing chat data and normalize it for the modal
    const normalizedUser = {
      ...chat,
      otherUserId: chat.otherUserId || chat.id,
      fullName: chat.fullName || chat.username || "Unknown User",
      description: chat.description || "No description",
      avatar: chat.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
      relationStatus: chat.relationStatus || "NONE",
      senderId: chat.senderId || null,
      isSender: chat.senderId === currentUser?.id,
      status: chat.status || "OFFLINE",
    };

    setSelectedUser(normalizedUser);
  };


  const fetchGroupDetails = async (groupId) => {
    try {
      const res = await api.get(`/groups/${Number(groupId)}/details`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      return res.data;
    } catch (err) {
      alert("Failed to fetch group details ❌");
      return null;
    }
  };

  const openGroupDetails = async (group) => {
    const details = await fetchGroupDetails(group.id);
    if (details) {
      setSelectedGroup({
        ...group,
        ...details,
        description: details.description ?? group.description ?? "",
        members: details.members ?? group.members ?? [],
        createdAt:
          details.createdAt ?? details.timestamp ?? group.createdAt ?? group.timestamp ?? null,
      });
    } else {
      setSelectedGroup({
        ...group,
        description: group.description ?? "",
        members: group.members ?? [],
        createdAt: group.createdAt ?? group.timestamp ?? null,
      });
    }
  };

  const closeGroupModal = () => setSelectedGroup(null);

  const removeUser = async (groupId, userId) => {
    if (!userId) {
      return;
    }
    
    try {
      await api.delete(`/groups/${groupId}/users/${userId}/remove`, {
        headers: { 
          Authorization: `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        },
      });
      
      // Show success message
      alert("User removed successfully ✅");
      
      // Refresh group details if modal is open
      if (selectedGroup) {
        const updated = await fetchGroupDetails(groupId);
        setSelectedGroup(updated);
      }
      
      // Refresh groups list
      const res = await api.get(`/groups`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      setGroups(res.data || []);
      
    } catch (err) {
      alert(`Failed to remove user ❌\nError: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="w-72 bg-gray-50 h-screen border-r overflow-y-auto p-3">
      <button
        onClick={() => navigate("/groups/create")}
        className="w-full bg-purple-600 text-white py-2 rounded mb-4 hover:bg-purple-700 transition"
      >
        + Create Group
      </button>

      {/* Private Chats */}
      <div>
        <h3 className="text-gray-700 font-bold mb-2">Chats</h3>

        {localChats.length === 0 ? (
          <p className="text-gray-500 text-sm">No chats yet</p>
        ) : (
          (Array.isArray(localChats) ? localChats : []).map((chat) => (
            <div
              key={chat.chatId}
              className="flex items-center p-2 mb-2 bg-white shadow-sm rounded justify-between"
            >
              <div
                className="flex-1 flex items-center cursor-pointer"
                onClick={() => handleClickChat(chat)}
              >
                <img
                  src={
                    chat.avatar 
                      ? (chat.avatar.startsWith('http') ? chat.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${chat.avatar}`)
                      : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
                  }
                  alt={chat.fullName || chat.username || "avatar"}
                  className="w-8 h-8 rounded mr-2 cursor-pointer hover:opacity-80 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    const imageUrl = chat.avatar 
                      ? (chat.avatar.startsWith('http') ? chat.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${chat.avatar}`)
                      : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg";
                    setPreviewImage(imageUrl);
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {chat.fullName || chat.username || "Unknown User"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {chat.username ? `@${chat.username}` : ""}
                  </span>
                </div>
              </div>

              <button
                onClick={() => openUserDetails(chat)}
                className="flex-shrink-0 bg-blue-600 text-white px-2 py-1 rounded text-sm ml-2"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Groups */}
      <div className="mt-4">
        <h3 className="text-gray-700 font-bold mb-2">Groups</h3>
        {groups.length === 0 ? (
          <div className="text-center py-4">
            <img
              src="https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png"
              alt="No groups"
              className="w-12 h-12 mx-auto mb-2 opacity-50"
            />
            <p className="text-gray-500 text-sm">No groups yet</p>
          </div>
        ) : (
          (Array.isArray(groups) ? groups : []).map((g) => {
            const groupAvatar = g.avatar 
              ? (g.avatar.startsWith('http') ? g.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${g.avatar}`)
              : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png";
            
            return (
              <div
                key={g.id}
                className="flex items-center p-2 mb-2 bg-white shadow-sm rounded justify-between"
              >
                <div
                  className="flex-1 flex items-center cursor-pointer"
                  onClick={() => {
                    onSelectChat({
                      id: g.id,
                      chatId: g.chatId || g.id, // Use chatId if available, fallback to id
                      name: g.name,
                      avatar: groupAvatar,
                      description: g.description,
                      members: g.members || [],
                      isGroup: true, // Mark as group chat
                    });
                    // Navigate to group chat
                    navigate(`/chat/${g.chatId || g.id}`);
                  }}
                >
                  <img
                    src={groupAvatar}
                    alt={g.name || "Group"}
                    className="w-8 h-8 rounded mr-2 object-cover cursor-pointer hover:opacity-80 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(groupAvatar);
                    }}
                    onError={(e) => {
                      e.target.src = "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png";
                    }}
                  />
                  <div>
                    <p className="font-bold">{g.name || "Unnamed Group"}</p>
                    {g.description && (
                      <p className="text-xs text-gray-500">{g.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openGroupDetails(g);
                  }}
                  className="flex-shrink-0 bg-blue-600 text-white px-2 py-1 rounded text-sm"
                >
                  View Details
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          currentUser={currentUser}
          onClose={closeGroupModal}
          onRemoveUser={removeUser}
          onRefresh={async (updatedDetails) => {
            setSelectedGroup(updatedDetails);
            const res = await api.get(`/groups`, {
              headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            setGroups(res.data || []);
          }}
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          currentUser={currentUser}
          onClose={() => setSelectedUser(null)}
          onSelectChat={onSelectChat}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          alt="Preview"
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
