import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function FriendsPage() {
    const [friends, setFriends] = useState([]);
    const [pending, setPending] = useState([]);
    const [search, setSearch] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [lastSearch, setLastSearch] = useState("");
    const [detailUser, setDetailUser] = useState(null);
    const navigate = useNavigate();

    const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem("currentUser")), []);

    // Fetch friends
    useEffect(() => {
        if (!currentUser?.token) return;
        const fetchFriends = async () => {
            try {
                const res = await api.get("/friends", {
                    headers: { Authorization: `Bearer ${currentUser.token}` },
                });
                const allFriends = res.data || [];
                const mapped = allFriends.map(normalizeUser);
                setPending(mapped.filter(f => f.relationStatus === "PENDING"));
                setFriends(mapped.filter(f => f.relationStatus === "ACCEPTED"));
            } catch (err) {
                console.error("Failed to fetch friends:", err);
            }
        };
        fetchFriends();
    }, [currentUser]);

    const normalizeUser = (user) => ({
        id: user.id,
        username: user.username || "",
        avatar: user.avatar 
          ? (user.avatar.startsWith('http') ? user.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${user.avatar}`)
          : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
        relationStatus: user.relationStatus || "NONE",
        senderId: user.senderId || null,
        isSender: user.senderId === currentUser.id,
        fullName: user.fullName || user.username || "",
        description: user.description || "",
        userStatus: user.userStatus || "OFFLINE",
    });


    // Search user
    const handleFindFriend = async () => {
        const query = search.trim();
        if (!query) return;
        if (query === lastSearch && searchResult) return;

        try {
            const res = await api.get(`/users/${query}`, {
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            const data = res.data;

            if (!data || data.id === currentUser.id) {
                if (data?.id === currentUser.id) alert("You cannot add yourself!");
                setSearchResult(null);
                setLastSearch("");
                return;
            }

            setSearchResult(normalizeUser(data));
            setLastSearch(query);
        } catch (err) {
            console.error("Friend not found", err);
            setSearchResult(null);
            setLastSearch("");
        }
    };

    // View user details
    const handleViewDetails = async (userId) => {
        try {
            const res = await api.get(`/users/${userId}/details`, {
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            const details = res.data;

            // Look for existing data (friends list or search result)
            const baseUser =
                allFriendsToShow.find(f => f.id === userId) ||
                searchResult ||
                { id: userId };

            // Merge details with base user (keep relationStatus, senderId, etc.)
            setDetailUser({
                ...baseUser,
                fullName: details.fullName || baseUser.fullName || baseUser.username || "No Name",
                description: details.description ?? baseUser.description ?? "No description",
                userStatus: details.status || baseUser.userStatus || "OFFLINE",
            });
        } catch (err) {
            console.error("Failed to fetch user details:", err);
        }
    };

    const handleAddFriend = async (friendId) => {
        if (!friendId) return;
        try {
            await api.post(`/friends/${friendId}`);
            alert("Friend request sent!");

            // Don’t force senderId here – let backend decide.
            const newPending = normalizeUser({
                id: friendId,
                username: searchResult?.username || "Unknown",
                avatar: searchResult?.avatar 
                  ? (searchResult.avatar.startsWith('http') ? searchResult.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${searchResult.avatar}`)
                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
                relationStatus: "PENDING",
                senderId: currentUser.id, // ⚠️ only for *your* UI session
            });

            // Update search result (only locally for the requester)
            setSearchResult(newPending);

            // Update pending list (UI)
            setPending(prev => {
                if (prev.some(f => f.id === friendId)) return prev;
                return [...prev, newPending];
            });

            // Update details modal if open
            setDetailUser(prev => prev ? { ...prev, ...newPending } : prev);

        } catch (err) {
            console.error(err);
            alert("Failed to send friend request");
        }
    };


    const handleRemoveFriend = async (friendId) => {
        if (!friendId) return;
        try {
            await api.delete(`/groups/${currentUser.id}/users/${friendId}/remove`, {
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            setFriends(prev => prev.filter(f => f.id !== friendId));
            setPending(prev => prev.filter(f => f.id !== friendId));
            if (searchResult?.id === friendId) setSearchResult(null);
            if (detailUser?.id === friendId) setDetailUser(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChangeStatus = async (friendId, status) => {
        if (!friendId) return;
        try {
            await api.put(`/friends/${friendId}?status=${status}`, null, {
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            setPending(prev => prev.filter(f => f.id !== friendId));
            if (status === "ACCEPTED") {
                const acceptedFriend = pending.find(f => f.id === friendId) || searchResult;
                if (acceptedFriend) setFriends(prev => [...prev, { ...acceptedFriend, relationStatus: "ACCEPTED" }]);
            }
            if (searchResult?.id === friendId) setSearchResult(null);
            if (detailUser?.id === friendId) setDetailUser(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleStartChat = async (friend) => {
        if (!friend || !friend.id) return;
        try {
            await api.post(`/chatrooms/users/${friend.id}`, null, {
                headers: { Authorization: `Bearer ${currentUser?.token}` },
            });
            navigate("/", {
                state: {
                    selectedChat: {
                        id: null,
                        chatId: [currentUser.id, friend.id].sort().join("_"),
                        type: "DIRECT",
                        members: [currentUser.id, friend.id],
                        name: friend.username,
                        avatar: friend.avatar 
                          ? (friend.avatar.startsWith('http') ? friend.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${friend.avatar}`)
                          : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg",
                        uniqueKey: `DIRECT_${[currentUser.id, friend.id].sort().join("_")}`,
                    },
                },
            });
        } catch (err) {
            console.error("Failed to create chatroom:", err);
            alert("Unable to start chat. Please try again.");
        }
    };

    const renderFriendActions = (user) => {
        if (!user || !user.id || !currentUser) return null;

        const startChatBtn = <button onClick={() => handleStartChat(user)} className="bg-blue-500 text-white px-2 py-1 rounded">Start Chat</button>;
        if (user.id === currentUser.id) return startChatBtn;

        if (user.relationStatus === "NONE" || !user.senderId) {
            return (
                <div className="flex flex-col gap-2">
                    {startChatBtn}
                    <button onClick={() => handleAddFriend(user.id)} className="bg-green-500 text-white px-2 py-1 rounded">Add Friend</button>
                </div>
            );
        }

        if (user.relationStatus === "PENDING") {
            if (user.isSender) {
                return (
                    <div className="flex flex-col gap-2">
                        {startChatBtn}
                        <span className="text-gray-500 text-sm">Request Sent</span>
                    </div>
                );
            }
            return (
                <div className="flex flex-col gap-2">
                    {startChatBtn}
                    <div className="flex gap-2">
                        <button onClick={() => handleChangeStatus(user.id, "ACCEPTED")} className="bg-green-500 text-white px-2 py-1 rounded">Accept</button>
                        <button onClick={() => handleChangeStatus(user.id, "DECLINED")} className="bg-red-500 text-white px-2 py-1 rounded">Decline</button>
                    </div>
                </div>
            );
        }

        if (user.relationStatus === "ACCEPTED") {
            return (
                <div className="flex flex-col gap-2">
                    {startChatBtn}
                    <button onClick={() => handleRemoveFriend(user.id)} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
                </div>
            );
        }

        return startChatBtn;
    };

    const allFriendsToShow = useMemo(() => {
        const merged = [...friends, ...pending];
        const uniqueMap = new Map();
        merged.forEach(f => { if (f) uniqueMap.set(f.id, f); });
        return searchResult
            ? [searchResult, ...Array.from(uniqueMap.values()).filter(f => f.id !== searchResult.id)]
            : Array.from(uniqueMap.values());
    }, [friends, pending, searchResult]);

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <button onClick={() => navigate("/")} className="mb-4 px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">← Back</button>
            <h1 className="text-2xl font-bold mb-4">Friends</h1>

            <div className="flex mb-6 space-x-2">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleFindFriend} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">Find</button>
            </div>

            <ul className="space-y-2">
                {allFriendsToShow.length > 0 ? allFriendsToShow.map(friend => (
                    <li key={friend.id} className={`flex items-center justify-between p-3 rounded shadow-sm ${searchResult?.id === friend.id ? "bg-yellow-100 border border-yellow-400" : "bg-gray-50"}`}>
                        <div className="flex items-center space-x-3">
                            <img 
                              src={
                                friend.avatar 
                                  ? (friend.avatar.startsWith('http') ? friend.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${friend.avatar}`)
                                  : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
                              } 
                              alt={friend.fullName} 
                              className="w-10 h-10 rounded-full" 
                            />
                            <div>
                                <div className="font-semibold">{friend.fullName}</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button onClick={() => handleViewDetails(friend.id)} className="bg-yellow-500 text-white px-2 py-1 rounded">View Details</button>
                            {renderFriendActions(friend)}
                        </div>
                    </li>
                )) : <p className="text-gray-500 text-center py-2">No friends found</p>}
            </ul>

            {/* User Detail Modal */}
            {detailUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{detailUser.fullName} (@{detailUser.username})</h2>
                            <button onClick={() => setDetailUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <img 
                          src={
                            detailUser.avatar 
                              ? (detailUser.avatar.startsWith('http') ? detailUser.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${detailUser.avatar}`)
                              : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"
                          } 
                          alt={detailUser.username} 
                          className="w-24 h-24 rounded-full mx-auto mb-4" 
                        />
                        <p><strong>Status:</strong> {detailUser.userStatus || "OFFLINE"}</p>
                        <p className="mb-4"><strong>Description:</strong> {detailUser.description || "No description"}</p>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => handleStartChat(detailUser)} className="bg-blue-500 text-white px-4 py-2 rounded">Start Chat</button>
                            {detailUser.relationStatus === "NONE" && <button onClick={() => handleAddFriend(detailUser.id)} className="bg-green-500 text-white px-4 py-2 rounded">Add Friend</button>}
                            {detailUser.relationStatus === "PENDING" && !detailUser.isSender && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleChangeStatus(detailUser.id, "ACCEPTED")} className="bg-green-500 text-white px-2 py-1 rounded">Accept</button>
                                    <button onClick={() => handleChangeStatus(detailUser.id, "DECLINED")} className="bg-red-500 text-white px-2 py-1 rounded">Decline</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
