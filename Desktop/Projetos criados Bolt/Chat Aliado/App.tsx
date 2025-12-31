
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import ConnectionPage from './pages/Connection';
import ChatPage from './pages/Chat';
import AdminPage from './pages/Admin';
import SettingsPage from './pages/Settings';
import WebhookLogs from './pages/WebhookLogs';
import { User, UserRole } from './types';

// Simple Auth Provider Mock (Integration would use Supabase session)
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we check Supabase session here
    // For MVP demonstration, we allow setting a mock user on login
    setLoading(false);
  }, []);

  const handleLogin = (mockUser: User) => {
    setUser(mockUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-dark">
        <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/chat" />}
        />

        <Route
          path="/chat"
          element={user ? <ChatPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />

        <Route
          path="/connection"
          element={
            user && user.role === UserRole.ADMIN
              ? <ConnectionPage user={user} />
              : <Navigate to="/chat" />
          }
        />

        <Route
          path="/admin"
          element={
            user && user.role === UserRole.ADMIN
              ? <AdminPage user={user} onLogout={handleLogout} />
              : <Navigate to="/chat" />
          }
        />

        <Route
          path="/settings"
          element={
            user && user.role === UserRole.ADMIN
              ? <SettingsPage user={user} onLogout={handleLogout} />
              : <Navigate to="/chat" />
          }
        />

        <Route
          path="/webhook-logs"
          element={
            user && user.role === UserRole.ADMIN
              ? <WebhookLogs user={user} onLogout={handleLogout} />
              : <Navigate to="/chat" />
          }
        />

        <Route path="*" element={<Navigate to={user ? "/chat" : "/login"} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
