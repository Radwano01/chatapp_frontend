import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;
const pendingSubscriptions = [];
const pendingMessages = [];

/** Return current STOMP client */
export function getStompClient() {
  return stompClient;
}

/** Connect socket with JWT token in query param */
export function connect(token, onConnect) {
  if (stompClient && stompClient.active) {
    console.warn("STOMP client already active");
    return;
  }

  // Disconnect existing client if any
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  const wsUrl = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_WS_PATH}?token=${token}`;
  console.log("WebSocket URL:", wsUrl);
  console.log("Environment variables:", {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_WS_PATH: process.env.REACT_APP_WS_PATH
  });
  const socket = new SockJS(wsUrl, null, {
    withCredentials: false
  });

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
  });

  stompClient.onConnect = (frame) => {
    console.log("STOMP client connected successfully", frame);
    console.log("STOMP client state:", {
      active: stompClient.active,
      connected: stompClient.connected,
      state: stompClient.state
    });

    // Process any queued subscriptions immediately
    console.log("Processing queued subscriptions and messages");
    
    // Process any queued subscriptions
    pendingSubscriptions.forEach(({ chatId, callback, isGroup }) => {
      console.log("Processing queued subscription for chatId:", chatId);
      _subscribe(chatId, callback, isGroup);
    });
    pendingSubscriptions.length = 0;

    // Flush any queued messages
    while (pendingMessages.length > 0) {
      const { destination, body } = pendingMessages.shift();
      try {
        stompClient.publish({ destination, body });
      } catch (e) {
        console.warn("Failed to publish queued message", e);
      }
    }

    if (onConnect) onConnect();
  };

  stompClient.onStompError = (frame) => {
    console.error("STOMP broker error:", frame.headers["message"], frame.body);
    console.error("STOMP error details:", frame);
  };

  stompClient.onWebSocketError = (error) => {
    console.error("WebSocket error:", error);
  };

  stompClient.onWebSocketClose = (event) => {
    console.warn("WebSocket closed:", event);
  };

  stompClient.activate();
}

/** Internal subscription helper */
function _subscribe(chatId, callback, isGroup) {
  console.log("_subscribe called with chatId:", chatId, "isGroup:", isGroup);
  console.log("STOMP client state:", {
    exists: !!stompClient,
    active: stompClient?.active,
    connected: stompClient?.connected,
    state: stompClient?.state
  });

  if (!stompClient) {
    console.warn("STOMP client not initialized");
    return;
  }

  if (!stompClient.active) {
    console.warn("STOMP client not active for subscription");
    return;
  }

  // Check if connected with a more robust method
  if (!stompClient.connected) {
    console.warn("STOMP client not connected yet, will retry");
    // Re-queue the subscription
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return;
  }

  const destination = isGroup
    ? `/topic/chatroom/${chatId}`
    : `/user/queue/chatroom/${chatId}`;

  try {
    console.log("Subscribing to:", destination);
    const subscription = stompClient.subscribe(destination, (message) => {
      console.log("Received message on", destination, ":", message.body);
      callback(JSON.parse(message.body));
    });
    console.log("Subscription successful:", subscription);
    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to chat:", error);
    // Re-queue the subscription for retry
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return null;
  }
}

/** Subscribe to a chat room */
export function subscribeToChat(chatId, callback, isGroup = false) {
  if (!stompClient || !stompClient.active || !stompClient.connected) {
    // Queue subscription until connected
    console.log("STOMP not ready, queueing subscription for chatId:", chatId);
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return null;
  }
  return _subscribe(chatId, callback, isGroup);
}

/** Send chat message (server identifies sender via Principal) */
export function sendChatMessage(message) {
  const destination = "/app/chat.sendMessage";
  const body = JSON.stringify(message);

  if (stompClient && stompClient.active && stompClient.connected) {
    stompClient.publish({ destination, body });
    return;
  }

  console.warn("STOMP not connected, queueing message");
  pendingMessages.push({ destination, body });
}

/** Send a message to a group chat */
export function sendGroupMessage(message) {
  if (!stompClient) {
    console.warn("STOMP client not initialized");
    return;
  }

  const publishMessage = () => {
    stompClient.publish({
      destination: "/app/chat.group",
      body: JSON.stringify(message),
    });
  };

  if (stompClient.active) {
    publishMessage();
  } else {
    console.warn("STOMP client not active, queuing message");
    // wait for connection
    const waitForConnect = setInterval(() => {
      if (stompClient.active) {
        publishMessage();
        clearInterval(waitForConnect);
      }
    }, 100);
  }
}


/** Check if socket is connected and reconnect if needed */
export function ensureConnected(token, onConnect) {
  console.log("ensureConnected called, current state:", {
    exists: !!stompClient,
    active: stompClient?.active,
    connected: stompClient?.connected,
    state: stompClient?.state
  });

  if (!stompClient || !stompClient.active || !stompClient.connected) {
    console.log("Socket not connected, reconnecting...");
    connect(token, onConnect);
  } else {
    console.log("Socket already connected");
  }
}

/** Disconnect WebSocket cleanly */
export function disconnectSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    pendingSubscriptions.length = 0;
  }
}
