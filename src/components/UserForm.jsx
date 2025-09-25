import { useState, useEffect } from "react";

export default function UserForm({ user, onSubmit }) {
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ username, fullName, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text" placeholder="Username" value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full px-3 py-2 border rounded" required
      />
      <input
        type="text" placeholder="Full Name" value={fullName}
        onChange={e => setFullName(e.target.value)}
        className="w-full px-3 py-2 border rounded" required
      />
      <input
        type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full px-3 py-2 border rounded" required={!user?.id}
      />
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Save</button>
    </form>
  );
}
