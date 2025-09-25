import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get(`/groups`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`, // ✅ send token
        },
      });
      setGroups(res.data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar currentUser={currentUser} />

      {/* Groups sidebar */}
      <div className="flex-1 bg-gray-50 p-2 overflow-y-auto w-72 border-r">
        <h2 className="text-gray-500 text-sm mb-1">Groups</h2>
        <ul className="space-y-2">
          {(Array.isArray(groups) ? groups : []).map((group) => (
            <li
              key={group.id} // ✅ use groupId instead of id
              className="flex items-center p-2 hover:bg-gray-200 rounded cursor-pointer"
            >
              <img
                src={
                  group.avatar 
                    ? (group.avatar.startsWith('http') ? group.avatar : `https://chat-app-radwan.s3.us-east-1.amazonaws.com/${group.avatar}`)
                    : "https://chat-app-radwan.s3.us-east-1.amazonaws.com/images/user-group.png"
                }
                alt={group.name}
                className="w-10 h-10 rounded mr-2 object-cover"
              />
              <div className="flex flex-col">
                <span className="font-semibold">{group.name}</span>
                <span className="text-xs text-gray-500 truncate">
                  {group.description || "No description"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
