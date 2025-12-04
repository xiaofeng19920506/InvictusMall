import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider, useNotification } from "./contexts/NotificationContext";
import AuthGuard from "./shared/components/AuthGuard";
import AdminApp from "./app/AdminApp";
import SetupPassword from "./features/auth/SetupPassword";
import NotificationSystem from "./shared/components/NotificationSystem";

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
<<<<<<< HEAD
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
=======
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </Provider>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
  );
}

export default App;
