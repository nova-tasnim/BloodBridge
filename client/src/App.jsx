import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/Shared';
import LiveStatsBar from './components/LiveStatsBar';
import PageTransition from './components/PageTransition';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';
import RequestsPage from './pages/RequestsPage';
import InventoryPage from './pages/InventoryPage';
import CampaignsPage from './pages/CampaignsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import MapPage from './pages/MapPage';
import QueuePage from './pages/QueuePage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/donors" replace />} />
        <Route path="/donors" element={<PageTransition><DonorsPage /></PageTransition>} />
        <Route path="/donations" element={<PageTransition><DonationsPage /></PageTransition>} />
        <Route path="/requests" element={<PageTransition><RequestsPage /></PageTransition>} />
        <Route path="/inventory" element={<PageTransition><InventoryPage /></PageTransition>} />
        <Route path="/campaigns" element={<PageTransition><CampaignsPage /></PageTransition>} />
        <Route path="/queue" element={<PageTransition><QueuePage /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboardPage /></PageTransition>} />
        <Route path="/map" element={<PageTransition><MapPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/donors" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <LiveStatsBar />
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}
