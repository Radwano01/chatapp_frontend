import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">ChatApp</h1>
      <div className="space-x-4">
        <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded">
          Login
        </Link>
        <Link to="/users" className="bg-green-600 text-white px-4 py-2 rounded">
          Manage Users
        </Link>
        <Link to="/groups" className="bg-purple-600 text-white px-4 py-2 rounded">
          Groups
        </Link>
        <Link to="/friends" className="bg-yellow-600 text-white px-4 py-2 rounded">
          Friends
        </Link>
        <Link to="/chat" className="bg-pink-600 text-white px-4 py-2 rounded">
          Chat
        </Link>
      </div>
    </div>
  );
}