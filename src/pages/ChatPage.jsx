import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import api from "../services/api";
import { ensureConnected } from "../services/socket";

export default function ChatPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const location = useLocation();
  const { chatId } = useParams();

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

  // Handle chatId from URL parameter
  useEffect(() => {
    console.log("ChatPage - chatId from URL:", chatId);
    console.log("ChatPage - chatRooms:", chatRooms);
    if (chatId && chatRooms.length > 0) {
      const chat = chatRooms.find(room => room.chatId === chatId);
      console.log("ChatPage - found chat:", chat);
      if (chat) {
        setSelectedChat(chat);
      }
    }
  }, [chatId, chatRooms]);

  // Ensure socket connection on page load/refresh
  useEffect(() => {
    if (currentUser?.token) {
      ensureConnected(currentUser.token, () => {
        console.log("Socket reconnected successfully");
      });
    }
  }, [currentUser?.token]);

  // Fetch chatrooms from backend
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem("currentUser"));
        const res = await api.get("/chatrooms", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        // Map backend response to local shape
        console.log("ChatPage - Backend response:", res.data);
        const rooms = (Array.isArray(res.data) ? res.data : []).map((room) => {
          console.log("ChatPage - Mapping room:", room);
          return {
            id: room.id,
            chatId: room.chatId,
            otherUserId: room.otherUserId,
            fullName: room.fullName,
            avatar: room.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          };
        });
        console.log("ChatPage - Mapped rooms:", rooms);
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
