import { Link } from "react-router-dom";

export default function UserList({ users }) {
  return (
    <ul className="space-y-2">
      {(Array.isArray(users) ? users : []).map(user => (
        <li key={user.id} className="p-2 border rounded flex justify-between items-center">
          <span>{user.username} ({user.fullName}) - <b>{user.status}</b></span>
          <Link to={`/users/edit/${user.id}`} className="bg-yellow-500 text-white px-2 rounded">Edit</Link>
        </li>
      ))}
    </ul>
  );
}
