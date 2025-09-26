import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import api from "../services/api";
import { disconnectSocket } from "../services/socket";

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
    if (chatId && chatRooms.length > 0) {
      const chat = chatRooms.find(room => room.chatId === chatId);
      if (chat) {
        setSelectedChat(chat);
      }
    }
  }, [chatId, chatRooms]);

  // Disconnect socket when component unmounts (user leaves page)
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  // Fetch chatrooms from backend
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem("currentUser"));
        const res = await api.get("/chatrooms", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        // Map backend response to local shape
        const rooms = (Array.isArray(res.data) ? res.data : []).map((room) => {
          return {
            id: room.id,
            chatId: room.chatId,
            otherUserId: room.otherUserId,
            fullName: room.fullName,
            avatar: room.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          };
        });
        setChatRooms(rooms);
      } catch (err) {
        // Handle error silently
      }
    };

    fetchChatRooms();
  }, []);

  return (
    <div className="flex flex-col sm:flex-row h-screen pt-16">
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
          {selectedChat ? (
            <ChatWindow
              key={selectedChat.chatId}
              currentUser={currentUser}
              selectedChat={selectedChat}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-600 mb-4">Welcome to Chat App</h2>
                <p className="text-gray-500">Select a chat from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
