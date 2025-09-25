import { useEffect, useState } from "react";
import api from "../services/api";
import UserList from "../components/UserList";
import { connectSocket } from "../services/socket";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

export default function Users() {
  const [users, setUsers] = useState([]);
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

  useEffect(() => {
    fetchUsers();
    if (currentUser) connectSocket(currentUser, updated => {
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    });
  }, []);

const fetchUsers = async () => {
  try {
    const token = currentUser?.token; // get the JWT from sessionStorage or currentUser
    const res = await api.get("/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setUsers(res.data);
  } catch (err) {
    console.error("Failed to fetch users:", err);
  }
};

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">All Users</h1>
          <Link to="/users/edit/new" className="bg-green-600 text-white px-4 py-2 rounded">Create</Link>
        </div>
        <UserList users={users} />
      </div>
    </div>
  );
}
