import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { connectSocket } from "../services/socket";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function Chat() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    api.get(`/messages/${chatId}`).then(res => setMessages(res.data));
    if (currentUser) {
      const client = connectSocket(currentUser, msg => {
        if (msg.chatId === chatId) setMessages(prev => [...prev, msg]);
      });
      setStompClient(client);
    }
  }, [chatId]);

  const sendMessage = () => {
    if (!input || !stompClient) return;
    const msg = { chatId, senderId: currentUser.id, content: input };
    stompClient.publish({ destination: "/chat.private", body: JSON.stringify(msg) });
    setInput("");
  };

  return (
    <div>
      <Navbar />
      <div className="p-6 flex flex-col h-[90vh]">
        <div className="flex-1 overflow-y-auto border p-2 rounded mb-2">
          {(messages || []).map((m, i) => (
            <div key={i} className="mb-1">
              <b>{m.senderId === currentUser.id ? "You" : m.senderId}:</b> {m.content}
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <input value={input} onChange={e => setInput(e.target.value)}
                 className="flex-1 px-3 py-2 border rounded"/>
          <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
        </div>
      </div>
    </div>
  );
}
