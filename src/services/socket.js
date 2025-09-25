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

  const socket = new SockJS(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_WS_PATH}?token=${token}`);

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
  });

  stompClient.onConnect = (frame) => {

    // Process any queued subscriptions
    pendingSubscriptions.forEach(({ chatId, callback, isGroup }) => {
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
    console.error("Broker error:", frame.headers["message"], frame.body);
  };

  stompClient.activate();
}

/** Internal subscription helper */
function _subscribe(chatId, callback, isGroup) {
  if (!stompClient || !stompClient.active) return;

  const destination = isGroup
    ? `/topic/chatroom/${chatId}`
    : `/user/queue/chatroom/${chatId}`;

  return stompClient.subscribe(destination, (message) => {
    callback(JSON.parse(message.body));
  });
}

/** Subscribe to a chat room */
export function subscribeToChat(chatId, callback, isGroup = false) {
  if (!stompClient || !stompClient.active) {
    // Queue subscription until connected
    pendingSubscriptions.push({ chatId, callback, isGroup });
    return;
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


/** Disconnect WebSocket cleanly */
export function disconnectSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    pendingSubscriptions.length = 0;
  }
}
