import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;
const pendingSubscriptions = [];
const pendingMessages = [];
let currentChatId = null; // Track current active chat

/** Return current STOMP client */
export function getStompClient() {
  return stompClient;
}

/** Connect socket with JWT token in query param */
export function connect(token, onConnect) {
  console.log("=== CONNECT FUNCTION CALLED ===");
  console.log("Token provided:", !!token);
  console.log("Current stompClient state:", {
    exists: !!stompClient,
    active: stompClient?.active,
    connected: stompClient?.connected,
  });

  // If already connected, just call onConnect
  if (stompClient && stompClient.connected) {
    console.log("STOMP client already connected");
    if (onConnect) onConnect();
    return;
  }

  // Deactivate any existing client
  if (stompClient) {
    console.log("Deactivating previous STOMP client...");
    stompClient.deactivate();
    stompClient = null;
  }

  const wsUrl = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_WS_PATH}?token=${token}`;
  console.log("WebSocket URL:", wsUrl);

  const socket = new SockJS(wsUrl, null, { withCredentials: false });

  // SockJS debug
  socket.onopen = () => console.log("✅ SockJS connection opened");
  socket.onclose = (event) => console.warn("❌ SockJS connection closed:", event);
  socket.onerror = (err) => console.error("❌ SockJS connection error:", err);

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
  });

  stompClient.onConnect = (frame) => {
    console.log("STOMP client connected ✅", frame);
    console.log("STOMP client state:", {
      active: stompClient.active,
      connected: stompClient.connected,
      state: stompClient.state,
    });

    // Flush queued subscriptions
    while (pendingSubscriptions.length > 0) {
      const { chatId, callback, isGroup } = pendingSubscriptions.shift();
      _subscribe(chatId, callback, isGroup, true);
    }

    // Flush queued messages
    while (pendingMessages.length > 0) {
      const { destination, body } = pendingMessages.shift();
      stompClient.publish({ destination, body });
      console.log("Queued message sent to:", destination);
    }

    if (onConnect) onConnect();
  };

  stompClient.onStompError = (frame) => {
    console.error("STOMP broker error:", frame.headers["message"], frame.body);
  };

  stompClient.onWebSocketError = (error) => {
    console.error("WebSocket error:", error);
  };

  stompClient.onWebSocketClose = (event) => {
    console.warn("WebSocket closed:", event);
  };

  console.log("Activating STOMP client...");
  stompClient.activate();
}

/** Internal subscription helper */
function _subscribe(chatId, callback, isGroup, fromQueue = false) {
  const destination = isGroup
    ? `/topic/chatroom/${chatId}`
    : `/user/queue/chatroom/${chatId}`;

  if (!stompClient) {
    console.warn("_subscribe: STOMP client not initialized");
    return;
  }

  if (!stompClient.connected && !fromQueue) {
    console.warn("_subscribe: STOMP client not connected yet, queuing");
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return;
  }

  try {
    const subscription = stompClient.subscribe(destination, (message) => {
      callback(JSON.parse(message.body));
    });
    console.log("_subscribe successful:", destination);
    return subscription;
  } catch (error) {
    console.error("_subscribe failed, re-queuing:", error);
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return null;
  }
}

/** Subscribe to a chat room */
export function subscribeToChat(chatId, callback, isGroup = false) {
  if (!stompClient || !stompClient.connected) {
    console.log("STOMP not connected, queuing subscription for chatId:", chatId);
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return null;
  }
  return _subscribe(chatId, callback, isGroup);
}

/** Send chat message */
export function sendChatMessage(message) {
  const destination = "/app/chat.sendMessage";
  const body = JSON.stringify(message);

  if (stompClient?.connected) {
    stompClient.publish({ destination, body });
    return;
  }

  console.warn("STOMP not connected, queuing message");
  pendingMessages.push({ destination, body });
}

/** Send a message to a group chat */
export function sendGroupMessage(message) {
  const destination = "/app/chat.group";
  const body = JSON.stringify(message);

  if (stompClient?.connected) {
    stompClient.publish({ destination, body });
  } else {
    console.warn("STOMP not connected, queuing group message");
    pendingMessages.push({ destination, body });
  }
}

/** Ensure connected, reconnect if needed */
export function ensureConnected(token, onConnect) {
  if (!stompClient?.connected) {
    console.log("Socket not connected, reconnecting...");
    connect(token, onConnect);
  } else {
    console.log("Socket already connected");
  }
}

/** Connect to chat room - only connect when entering a chat */
export function connectToChat(chatId, token, onConnect) {
  console.log("Connecting to chat:", chatId);
  currentChatId = chatId;
  connect(token, onConnect);
}

/** Disconnect from current chat room */
export function disconnectFromChat() {
  console.log("Disconnecting from chat:", currentChatId);
  currentChatId = null;
  disconnectSocket();
}

/** Disconnect WebSocket cleanly */
export function disconnectSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    pendingSubscriptions.length = 0;
    pendingMessages.length = 0;
    currentChatId = null;
    console.log("STOMP client disconnected");
  }
}

/** Get current chat ID */
export function getCurrentChatId() {
  return currentChatId;
}
