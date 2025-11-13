import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider, useNotification } from "./contexts/NotificationContext";
import AuthGuard from "./components/AuthGuard";
import AdminApp from "./components/AdminApp";
import SetupPassword from "./components/SetupPassword";
import NotificationSystem from "./components/NotificationSystem";

function AppContent() {
  const { notifications, removeNotification } = useNotification();

  return (
    <>
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
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
