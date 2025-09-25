import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

export default function AddGroupMembersPage() {
  const { groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  // Helper: resolve numeric group id robustly
  const resolveNumericGroupId = useCallback(() => {
    const fromParam = Number(groupId);
    if (Number.isFinite(fromParam)) return fromParam;
    const match = location.pathname.match(/\/groups\/(\d+)\/add-members/);
    if (match && match[1]) {
      const fromPath = Number(match[1]);
      if (Number.isFinite(fromPath)) return fromPath;
    }
    return null;
  }, [groupId, location.pathname]);

  // Fetch current group members on mount
  useEffect(() => {
    const fetchGroupMembers = async () => {
      const numericGroupId = resolveNumericGroupId();
      if (!Number.isFinite(numericGroupId)) return; // wait until param is available
      try {
        const res = await api.get(`/groups/${numericGroupId}/details`);
        setGroupMembers(res.data.members || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchGroupMembers();
  }, [groupId, location.pathname, resolveNumericGroupId]);

  // Search user by username
  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/${username}`);
      setFoundUser(res.data);
    } catch (err) {
      console.error(err);
      alert("User not found ❌");
      setFoundUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Add user to the group
  const handleAddUser = async () => {
    if (!foundUser) return;
    setAdding(true);
    try {
      const numericGroupId = resolveNumericGroupId();
      if (!Number.isFinite(numericGroupId)) {
        alert("Invalid group id");
        setAdding(false);
        return;
      }
      await api.put(`/groups/${numericGroupId}/users/${foundUser.username}`);
      alert(`${foundUser.fullName} added to the group ✅`);
      navigate(-1); // go back
    } catch (err) {
      console.error(err);
      alert("Failed to add user ❌");
    } finally {
      setAdding(false);
    }
  };

  // Check if found user is already in group
  const isAlreadyMember = foundUser && groupMembers.some((m) => m.id === foundUser.id);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h1 className="text-xl font-bold mb-4 text-center">Add Members</h1>

        {/* Username input */}
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 p-2 border rounded-l"
            disabled={loading || adding}
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-3 py-2 rounded-r hover:bg-blue-700"
            disabled={loading || adding}
          >
            Search
          </button>
        </div>

        {/* Loading */}
        {loading && <p className="text-center text-gray-500">Searching...</p>}

        {/* Found user */}
        {foundUser && (
          <div className="p-3 mb-4 border rounded flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={foundUser.avatar || "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-blue.jpg"}
                alt={foundUser.fullName}
                className="w-10 h-10 rounded mr-2"
              />
              <div>
                <p className="font-medium">{foundUser.fullName}</p>
                <p className="text-xs text-gray-500">@{foundUser.username}</p>
              </div>
            </div>
            {isAlreadyMember ? (
              <span className="text-gray-500 text-sm">Already in group</span>
            ) : (
              <button
                onClick={handleAddUser}
                className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                disabled={adding}
              >
                {adding ? "Adding..." : "Add"}
              </button>
            )}
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={() => navigate(-1)}
          className="w-full px-3 py-2 rounded bg-gray-300 text-black hover:bg-gray-400"
          disabled={adding}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
