import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Shared';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';
import RequestsPage from './pages/RequestsPage';
import InventoryPage from './pages/InventoryPage';
import CampaignsPage from './pages/CampaignsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import QueuePage from './pages/QueuePage';
export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/donors" replace />} />
          <Route path="/donors" element={<DonorsPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/donors" replace />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}