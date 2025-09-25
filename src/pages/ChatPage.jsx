import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import api from "../services/api";

export default function ChatPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const location = useLocation();

  // Handle navigation from other pages (e.g., FriendsPage)
  useEffect(() => {
    if (location.state?.selectedChat) {
      const newChat = location.state.selectedChat;
      setSelectedChat(newChat);

      // Add to chatRooms if not already present
      setChatRooms((prev) => {
        const exists = prev.some((room) => room.chatId === newChat.chatId);
        return exists ? prev : [...prev, newChat];
      });
    }
  }, [location.state]);

  // Fetch chatrooms from backend
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem("currentUser"));
        const res = await api.get("/chatrooms", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        // Map backend response to local shape
        const rooms = (res.data || []).map((room) => ({
          id: room.id,
          chatId: room.chatId,
          otherUserId: room.otherUserId,
          fullName: room.fullName,
          avatar: room.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
        }));

        setChatRooms(rooms);
      } catch (err) {
        console.error("Failed to fetch chat rooms:", err);
      }
    };

    fetchChatRooms();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar
        currentUser={currentUser}
        users={users}
        setUsers={setUsers}
        chatRooms={chatRooms}
        onSelectChat={setSelectedChat}
      />

      <div className="flex-1 flex flex-col">
        <Navbar currentUser={currentUser} />
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          {selectedChat && (
            <ChatWindow
              key={selectedChat.chatId}
              currentUser={currentUser}
              selectedChat={selectedChat}
            />
          )}
        </div>
      </div>
    </div>
  );
}
