import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AuthGuard from "./components/AuthGuard";
import AdminApp from "./components/AdminApp";
import SetupPassword from "./components/SetupPassword";
import NotificationSystem, {
  type Notification,
} from "./components/NotificationSystem";

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/setup-password" element={<SetupPassword />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <AdminApp />
              </AuthGuard>
            }
          />
        </Routes>
        <NotificationSystem
          notifications={notifications}
          onRemove={removeNotification}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
