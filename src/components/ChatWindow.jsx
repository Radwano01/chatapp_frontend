import { useEffect, useState, useRef } from "react";
import { getStompClient, sendChatMessage, sendGroupMessage, subscribeToChat, connectToChat, disconnectFromChat } from "../services/socket";
import { uploadToBackend, MESSAGE_TYPES } from "../services/upload";
import api from "../services/api";
import ImagePreviewModal from "./ImagePreviewModal";
import AudioMessagePlayer from "./AudioMessagePlayer";
import VideoMessagePlayer from "./VideoMessagePlayer";

export default function ChatWindow({ currentUser, selectedChat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const S3_BASE_URL = "https://chat-app-radwan.s3.us-east-1.amazonaws.com/";

  const chatId = selectedChat?.chatId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildMediaUrl = (key) => {
    if (!key) return null;
    const trimmed = key.startsWith("/") ? key.slice(1) : key;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return S3_BASE_URL + trimmed;
  };

  const inferTypeFromKey = (key) => {
    if (!key) return null;
    const lower = key.toLowerCase();
    if (lower.startsWith("images/") || /\.(png|jpe?g|gif|webp|svg)$/.test(lower)) return MESSAGE_TYPES.IMAGE;
    if (lower.startsWith("videos/") || /\.(mp4|webm|ogg|mov)$/.test(lower)) return MESSAGE_TYPES.VIDEO;
    if (lower.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm)$/.test(lower)) return MESSAGE_TYPES.AUDIO;
    return MESSAGE_TYPES.FILE;
  };



  useEffect(() => {
    if (!chatId) return;
    scrollToBottom();
  }, [messages.length, chatId]);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${chatId}`);
        const formatted = (Array.isArray(res.data) ? res.data : []).map(msg => ({
          ...msg,
          senderName: msg.senderName || "Unknown",
          senderAvatar: msg.senderAvatar 
            ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${msg.senderAvatar}`)
            : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          content: msg.deleted ? "This message was deleted" : (msg.content ?? ""),
          media: msg.deleted ? null : msg.media,
        }));
        setMessages(formatted);
        scrollToBottom();
      } catch (err) {
      }
    };

    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !currentUser?.token) return;

    
    // Connect to the chat room
    connectToChat(chatId, currentUser.token, () => {
    });

    const isGroup = selectedChat?.isGroup || (selectedChat?.members?.length || 0) > 2;
    
    // Subscribe to messages
    const messageSub = subscribeToChat(chatId, (incoming) => {
      if (incoming.deleted && incoming.messageId) {
        setMessages(prev =>
          prev.map(m =>
            m.id === incoming.messageId
              ? { ...m, deleted: true, content: "This message was deleted" }
              : m
          )
        );
      } else {
        setMessages(prev => [
          ...prev,
          {
            ...incoming,
            senderName: incoming.senderName || incoming.senderUsername || "Unknown",
            senderAvatar: incoming.senderAvatar 
              ? (incoming.senderAvatar.startsWith('http') ? incoming.senderAvatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${incoming.senderAvatar}`)
              : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          },
        ]);
        scrollToBottom();
      }
    }, isGroup);

    const client = getStompClient();
    let typingSub;
    if (client && client.connected) {
      const typingDestination = isGroup
        ? `/topic/chatroom/${chatId}typing`
        : `/user/queue/chatroom/${chatId}typing`;
      typingSub = client.subscribe(typingDestination, (msg) => {
        const typingDTO = JSON.parse(msg.body);
        if (typingDTO.senderId === currentUser.id) return;
        setTypingUsers(prev => {
          if (typingDTO.typing) {
            if (!prev.includes(typingDTO.fullName)) return [...prev, typingDTO.fullName];
            return prev;
          } else {
            return prev.filter(name => name !== typingDTO.fullName);
          }
        });
      });
    }

    return () => {
      if (messageSub && typeof messageSub.unsubscribe === "function") messageSub.unsubscribe();
      if (typingSub) typingSub.unsubscribe();
      disconnectFromChat();
    };
  }, [chatId, currentUser.id, currentUser.token, selectedChat]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const client = getStompClient();
    if (client && client.connected) {
      try {
        client.publish({
          destination: "/app/chat.typing",
          body: JSON.stringify({
            chatId,
            senderId: currentUser.id,
            fullName: currentUser.fullName,
            username: currentUser.username,
            typing: value.length > 0,
          }),
        });
      } catch (error) {
      }
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (client && client.connected) {
        try {
          client.publish({
            destination: "/app/chat.typing",
            body: JSON.stringify({
              chatId,
              senderId: currentUser.id,
              fullName: currentUser.fullName,
              username: currentUser.username,
              typing: false,
            }),
          });
        } catch (error) {
        }
      }
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !mediaFile) return;

    const recipientId =
      selectedChat.members?.length === 2
        ? selectedChat.members.find(id => id !== currentUser.id)
        : null;

    let uploadedFilename = null;
    let messageType = MESSAGE_TYPES.TEXT;
    if (mediaFile) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        const { filename, messageType: t } = await uploadToBackend(
          mediaFile,
          undefined,
          (p) => setUploadProgress(p)
        );
        uploadedFilename = filename;
        messageType = t;
      } catch (err) {
        const status = err?.response?.status;
        alert(`Upload failed${status ? ` (${status})` : ""}`);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const payload = {
      chatId,
      recipientId,
      content: newMessage,
      media: uploadedFilename,
      type: messageType, // Backend expects 'type' not 'messageType'
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar 
        ? (currentUser.avatar.startsWith('http') ? currentUser.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${currentUser.avatar}`)
        : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
    };

    try {
      const isGroup = selectedChat?.isGroup || (selectedChat.members?.length || 0) > 2;
      
      if (isGroup) {
        sendGroupMessage(payload);
      } else {
        sendChatMessage(payload);
      }

      setNewMessage("");
      setMediaFile(null); // Clear audio after sending
      setUploadProgress(0);
    } catch (err) {
    }

    const client = getStompClient();
    if (client && client.connected) {
      try {
        client.publish({
          destination: "/app/chat.typing",
          body: JSON.stringify({
            chatId,
            senderId: currentUser.id,
            fullName: currentUser.fullName,
            username: currentUser.username,
            typing: false,
          }),
        });
      } catch (error) {
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) recordedChunksRef.current.push(evt.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        setMediaFile(file);
        setIsRecording(false);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission is required");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && isRecording) {
      rec.stop();
      mediaRecorderRef.current = null;
    }
  };

  const handleDelete = (messageId) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, deleted: true, content: "This message was deleted" } : m
      )
    );

    const client = getStompClient();
    if (client && client.connected) {
      client.publish({
        destination: "/app/chat.deletePrivateMessage",
        body: JSON.stringify({ messageId, chatId }),
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-100">
        {(Array.isArray(messages) ? messages : []).map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.senderId === currentUser.id ? "justify-end" : "justify-start"} mb-1`}>
            <div className={`p-2 rounded max-w-xs sm:max-w-md ${msg.deleted ? "bg-gray-200 text-gray-600" : (msg.senderId === currentUser.id ? "bg-blue-500 text-white" : "bg-white")}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <img 
                    src={msg.senderAvatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"} 
                    alt="avatar" 
                    className="w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover cursor-pointer hover:opacity-80 transition" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(msg.senderAvatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg");
                    }}
                  />
                  <span className="font-semibold text-xs sm:text-sm">{msg.senderName}</span>
                </div>
                {!msg.deleted && msg.senderId === currentUser.id && (
                  <button className="ml-2 text-red-500 hover:text-red-700" onClick={() => handleDelete(msg.id)}>🗑</button>
                )}
              </div>
              <span className={`text-xs sm:text-sm ${msg.deleted ? "italic text-gray-500" : ""}`}>
                {msg.deleted ? "This message was deleted" : msg.content}
                {msg.media && !msg.deleted && (() => {
                  const t = msg.messageType || inferTypeFromKey(msg.media);
                  console.log('Debug - Message type detection:', {
                    messageType: msg.messageType,
                    inferredType: inferTypeFromKey(msg.media),
                    finalType: t,
                    media: msg.media,
                    isVideo: t === MESSAGE_TYPES.VIDEO,
                    isAudio: t === MESSAGE_TYPES.AUDIO
                  });
                  if (t === MESSAGE_TYPES.VIDEO) return " 📹 User sent a video";
                  if (t === MESSAGE_TYPES.AUDIO) return " 🎤 Voice message";
                  if (t === MESSAGE_TYPES.IMAGE) return " 📷 Photo";
                  return "";
                })()}
              </span>
              {msg.media && !msg.deleted && (() => {
                const url = buildMediaUrl(msg.media);
                const t = msg.messageType || inferTypeFromKey(msg.media);
                if (t === MESSAGE_TYPES.IMAGE) return <img src={url} alt="media" className="max-w-[200px] sm:max-w-xs rounded mt-2 cursor-pointer hover:opacity-90 transition" onClick={() => setPreviewImage(url)} />;
                if (t === MESSAGE_TYPES.VIDEO) return <VideoMessagePlayer src={url} />;
                if (t === MESSAGE_TYPES.AUDIO) return <AudioMessagePlayer src={url} duration={msg.duration} />;
                return <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all mt-2">{msg.media}</a>;
              })()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
        {typingUsers.length > 0 && (
          <div className="h-5 text-sm text-gray-500 italic">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex flex-col sm:flex-row p-2 border-t bg-white gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 px-2 sm:px-3 py-2 border rounded text-sm sm:text-base"
          disabled={isRecording} // Only disabled when actively recording
        />
        <div className="flex gap-2">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={isRecording}
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="px-2 sm:px-3 py-2 bg-gray-200 rounded text-xs sm:text-sm cursor-pointer hover:bg-gray-300"
          >
            📎
          </label>
          {isUploading && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600 w-16 sm:w-24">
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-blue-600 h-2 rounded" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-2 sm:px-3 py-2 rounded text-xs sm:text-sm ${isRecording ? "bg-red-600 text-white" : "bg-gray-200"}`}
            title={isRecording ? "Stop Recording" : "Record Voice"}
          >
            {isRecording ? "Stop" : "Rec"}
          </button>
          {mediaFile && mediaFile.type?.startsWith("audio/") && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span className="px-2 py-1 bg-gray-200 rounded">Audio ready</span>
              <button
                type="button"
                onClick={() => setMediaFile(null)}
                className="px-2 py-1 rounded bg-gray-300 hover:bg-gray-400 text-xs"
                title="Delete recorded audio"
              >
                ✕
              </button>
            </div>
          )}
          <button type="submit" className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm">Send</button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          alt="Avatar Preview"
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
