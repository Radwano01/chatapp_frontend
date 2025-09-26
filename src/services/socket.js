import { Client } from "@stomp/stompjs";
import { ENV_CONFIG } from "../config/environment";

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

  // If already connected, just call onConnect
  if (stompClient && stompClient.connected) {
    if (onConnect) onConnect();
    return;
  }

  // Deactivate any existing client
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  const wsUrl = `${ENV_CONFIG.FULL_WS_URL}?token=${token}`;

  stompClient = new Client({
    brokerURL: wsUrl, // ✅ direct WebSocket, no SockJS
    reconnectDelay: 5000,
  });

  stompClient.onConnect = (frame) => {

    // Flush queued subscriptions
    while (pendingSubscriptions.length > 0) {
      const { chatId, callback, isGroup } = pendingSubscriptions.shift();
      _subscribe(chatId, callback, isGroup, true);
    }

    // Flush queued messages
    while (pendingMessages.length > 0) {
      const { destination, body } = pendingMessages.shift();
      stompClient.publish({ destination, body });
    }

    if (onConnect) onConnect();
  };

  stompClient.onStompError = (frame) => {
  };

  stompClient.onWebSocketError = (error) => {
    setTimeout(() => {
      if (!stompClient?.connected) {
        connect(token, onConnect);
      }
    }, 5000);
  };

  stompClient.onWebSocketClose = (event) => {
    if (!event.wasClean) {
      setTimeout(() => {
        if (!stompClient?.connected) {
          connect(token, onConnect);
        }
      }, 3000);
    }
  };

  stompClient.activate();
}

/** Internal subscription helper */
function _subscribe(chatId, callback, isGroup, fromQueue = false) {
  const destination = isGroup
    ? `/topic/chatroom/${chatId}`
    : `/user/queue/chatroom/${chatId}`;

  console.log("Debug - _subscribe called");
  console.log("Debug - chatId:", chatId);
  console.log("Debug - isGroup:", isGroup);
  console.log("Debug - destination:", destination);
  console.log("Debug - stompClient connected:", stompClient?.connected);

  if (!stompClient) {
    console.log("Debug - No stompClient available");
    return;
  }

  if (!stompClient.connected && !fromQueue) {
    console.log("Debug - StompClient not connected, queuing subscription");
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return;
  }

  try {
    console.log("Debug - Subscribing to:", destination);
    const subscription = stompClient.subscribe(destination, (message) => {
      console.log("Debug - Received message on subscription:", message.body);
      callback(JSON.parse(message.body));
    });
    return subscription;
  } catch (error) {
    console.error("Debug - Error subscribing:", error);
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return null;
  }
}

/** Subscribe to a chat room */
export function subscribeToChat(chatId, callback, isGroup = false) {
  if (!stompClient || !stompClient.connected) {
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
    try {
      stompClient.publish({ destination, body });
      return;
    } catch (error) {
    }
  }

  pendingMessages.push({ destination, body });
}

/** Send a message to a group chat */
export function sendGroupMessage(message) {
  const destination = "/app/chat.group";
  const body = JSON.stringify(message);
  
  console.log("Debug - sendGroupMessage called");
  console.log("Debug - destination:", destination);
  console.log("Debug - message:", message);
  console.log("Debug - stompClient connected:", stompClient?.connected);

  if (stompClient?.connected) {
    try {
      console.log("Debug - Publishing group message");
      stompClient.publish({ destination, body });
    } catch (error) {
      console.error("Debug - Error publishing group message:", error);
    }
  } else {
    console.log("Debug - StompClient not connected, queuing message");
    pendingMessages.push({ destination, body });
  }
}

/** Check if WebSocket is connected */
export function isConnected() {
  return stompClient?.connected || false;
}

/** Ensure connected, reconnect if needed */
export function ensureConnected(token, onConnect) {
  if (!stompClient?.connected) {
    connect(token, onConnect);
  } else {
    if (onConnect) onConnect();
  }
}

/** Connect to chat room - only connect when entering a chat */
export function connectToChat(chatId, token, onConnect) {
  currentChatId = chatId;
  connect(token, onConnect);
}

/** Disconnect from current chat room */
export function disconnectFromChat() {
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
  }
}

/** Get current chat ID */
export function getCurrentChatId() {
  return currentChatId;
}
