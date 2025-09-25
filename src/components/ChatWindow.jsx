import { useEffect, useState, useRef } from "react";
import { getStompClient, sendChatMessage, sendGroupMessage, subscribeToChat } from "../services/socket";
import { uploadToBackend, MESSAGE_TYPES } from "../services/upload";
import api from "../services/api";

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
    if (lower.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm)$/.test(lower)) return MESSAGE_TYPES.VOICE;
    return MESSAGE_TYPES.FILE;
  };

  const formatTime = (secs) => {
    if (!Number.isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  function AudioMessagePlayer({ src }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      const audio = new Audio(src);
      audioRef.current = audio;

      const onLoaded = () => setDuration(audio.duration || 0);
      const onTime = () => setProgress(audio.currentTime || 0);
      const onEnded = () => {
        setIsPlaying(false);
        setProgress(0);
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("timeupdate", onTime);
      audio.addEventListener("ended", onEnded);

      return () => {
        audio.pause();
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("timeupdate", onTime);
        audio.removeEventListener("ended", onEnded);
        audioRef.current = null;
      };
    }, [src]);

    const togglePlay = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (e) {
          console.error("Failed to play audio", e);
        }
      }
    };

    const handleSeek = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const audio = audioRef.current;
      if (audio && Number.isFinite(duration) && duration > 0) {
        audio.currentTime = ratio * duration;
        setProgress(audio.currentTime);
      }
    };

    const pct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

    return (
      <div className="flex items-center gap-2 max-w-xs">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${isPlaying ? "bg-red-500 text-white" : "bg-blue-600 text-white"}`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-0">Voice message</div>
          <div className="flex items-center gap-1">
            <div className="relative h-2 bg-gray-200 rounded w-40 cursor-pointer" onClick={handleSeek}>
              <div className="absolute left-0 top-0 h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }}></div>
            </div>
            <div className="text-xs text-gray-600 min-w-[50px] text-right">
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!chatId) return;
    scrollToBottom();
  }, [messages.length, chatId]);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${chatId}`);
        const formatted = res.data.map(msg => ({
          ...msg,
          senderName: msg.senderName || "Unknown",
          senderAvatar: msg.senderAvatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
          content: msg.deleted ? "This message was deleted" : (msg.content ?? ""),
          media: msg.deleted ? null : msg.media,
        }));
        setMessages(formatted);
        scrollToBottom();
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const isGroup = (selectedChat?.members?.length || 0) > 2;
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
            senderAvatar: incoming.senderAvatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
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
    };
  }, [chatId, currentUser.id, selectedChat?.members?.length]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const client = getStompClient();
    if (client && client.connected) {
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
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      client?.publish({
        destination: "/app/chat.typing",
        body: JSON.stringify({
          chatId,
          senderId: currentUser.id,
          fullName: currentUser.fullName,
          username: currentUser.username,
          typing: false,
        }),
      });
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
        const message = err?.response?.data || err?.message || "Upload failed";
        console.error("Upload failed", status, message);
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
      messageType,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar,
    };

    try {
      const isGroup = (selectedChat.members?.length || 0) > 2;
      if (isGroup) {
        sendGroupMessage(payload);
      } else {
        sendChatMessage(payload);
      }

      setNewMessage("");
      setMediaFile(null); // Clear audio after sending
      setUploadProgress(0);
    } catch (err) {
      console.error("Failed to send message", err);
    }

    const client = getStompClient();
    if (client && client.connected) {
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
      console.error("Failed to start recording", err);
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
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.senderId === currentUser.id ? "justify-end" : "justify-start"} mb-1`}>
            <div className={`p-2 rounded ${msg.deleted ? "bg-gray-200 text-gray-600" : (msg.senderId === currentUser.id ? "bg-blue-500 text-white" : "bg-white")}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {msg.senderAvatar && <img src={msg.senderAvatar} alt="avatar" className="w-6 h-6 rounded-full" />}
                  <span className="font-semibold text-sm">{msg.senderName}</span>
                </div>
                {!msg.deleted && msg.senderId === currentUser.id && (
                  <button className="ml-2 text-red-500 hover:text-red-700" onClick={() => handleDelete(msg.id)}>🗑</button>
                )}
              </div>
              <span className={msg.deleted ? "italic text-gray-500" : ""}>{msg.deleted ? "This message was deleted" : msg.content}</span>
              {msg.media && !msg.deleted && (() => {
                const url = buildMediaUrl(msg.media);
                const t = msg.messageType || inferTypeFromKey(msg.media);
                if (t === MESSAGE_TYPES.IMAGE) return <img src={url} alt="media" className="max-w-xs rounded mt-2" />;
                if (t === MESSAGE_TYPES.VIDEO) return <video src={url} className="max-w-xs rounded mt-2" controls preload="metadata" />;
                if (t === MESSAGE_TYPES.VOICE) return <AudioMessagePlayer src={url} />;
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

      <form onSubmit={handleSend} className="flex p-2 border-t bg-white">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded mr-2"
          disabled={isRecording || (mediaFile && mediaFile.type?.startsWith("audio/"))} // Disabled if recording or audio ready
        />
        <input
          type="file"
          onChange={handleFileChange}
          className="mr-2"
          disabled={isRecording || (mediaFile && mediaFile.type?.startsWith("audio/"))}
        />
        {isUploading && (
          <div className="flex items-center mr-2 text-sm text-gray-600 w-24">
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-blue-600 h-2 rounded" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`mr-2 px-3 py-2 rounded ${isRecording ? "bg-red-600 text-white" : "bg-gray-200"}`}
          title={isRecording ? "Stop Recording" : "Record Voice"}
        >
          {isRecording ? "Stop" : "Rec"}
        </button>
        {mediaFile && mediaFile.type?.startsWith("audio/") && (
          <div className="flex items-center gap-2 mr-2 text-xs text-gray-700">
            <span className="px-2 py-1 bg-gray-200 rounded">Recorded audio ready</span>
            <button
              type="button"
              onClick={() => setMediaFile(null)}
              className="px-2 py-1 rounded bg-gray-300 hover:bg-gray-400"
              title="Delete recorded audio"
            >
              Delete Rec
            </button>
          </div>
        )}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
      </form>
    </div>
  );
}
