import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Shared';
import LiveStatsBar from './components/LiveStatsBar';
import AssistantChat from './components/AssistantChat';
import PageTransition from './components/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';
import RequestsPage from './pages/RequestsPage';
import InventoryPage from './pages/InventoryPage';
import CampaignsPage from './pages/CampaignsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import MapPage from './pages/MapPage';
import QueuePage from './pages/QueuePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ReminderPage from './pages/ReminderPage';

const AUTH_ROUTES = ['/login', '/register'];

// Hides the Navbar + LiveStatsBar + AssistantChat on /login and /register so an
// unauthenticated visitor sees a proper locked landing page instead
// of the full app chrome with links they can't actually use yet.
function AppChrome({ children }) {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  if (isAuthRoute) {
    return children;
  }

  return (
    <>
      <Navbar />
      <LiveStatsBar />
      {children}
      <AssistantChat />
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <PageTransition><LoginPage /></PageTransition>
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <PageTransition><RegisterPage /></PageTransition>
            </AuthLayout>
          }
        />

        <Route path="/" element={<Navigate to="/donors" replace />} />
        <Route
          path="/donors"
          element={
            <ProtectedRoute>
              <PageTransition><DonorsPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/donations"
          element={
            <ProtectedRoute>
              <PageTransition><DonationsPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <PageTransition><RequestsPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={['BloodBank', 'Hospital', 'Admin']}>
              <PageTransition><InventoryPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <PageTransition><CampaignsPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/queue"
          element={
            <ProtectedRoute>
              <PageTransition><QueuePage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['Admin']}>
              <PageTransition><AdminDashboardPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <PageTransition><MapPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LeaderboardPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <PageTransition>
                <ReminderPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/donors" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <AppChrome>
            <AnimatedRoutes />
          </AppChrome>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}