// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import ChatPage from "./pages/ChatPage";
import PrivateRoute from "./components/PrivateRoute";
import EditUser from "./pages/EditUser";
import CreateGroup from "./pages/CreateGroup";
import EditPasswordPage from "./pages/EditPasswordPage";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import EditGroupPage from "./pages/EditGroup";
import FriendsPage from "./pages/FriendsPage"; // ✅ import FriendsPage
import AddGroupMembersPage from "./pages/AddGroupMembersPage";
import { setupAutoLogout } from "./services/logout";

export default function App() {
  // Set up automatic logout when user exits the website
  useEffect(() => {
    const cleanup = setupAutoLogout();
    return cleanup;
  }, []);
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route
          path="/*"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/users/:id/edit"
          element={
            <PrivateRoute>
              <EditUser />
            </PrivateRoute>
          }
        />

        <Route
          path="/users/:id/change-password"
          element={
            <PrivateRoute>
              <EditPasswordPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/groups/create"
          element={
            <PrivateRoute>
              <CreateGroup />
            </PrivateRoute>
          }
        />

        <Route
          path="/groups/:groupId/edit"
          element={
            <PrivateRoute>
              <EditGroupPage />
            </PrivateRoute>
          }
        />

        

        {/* ✅ Add Friends Page */}
        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <FriendsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/groups/:groupId/add-members"
          element={
            <PrivateRoute>
              <AddGroupMembersPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}
