import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

const Home           = lazy(() => import('./pages/Home'));
const Login          = lazy(() => import('./pages/Login'));
const Register       = lazy(() => import('./pages/Register'));
const VerifyEmail    = lazy(() => import('./pages/VerifyEmail'));
const Feed           = lazy(() => import('./pages/Feed'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile'));
const Messages       = lazy(() => import('./pages/Messages'));
const Payouts        = lazy(() => import('./pages/Payouts'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const Settings       = lazy(() => import('./pages/Settings'));
const ContentManager = lazy(() => import('./pages/ContentManager'));
const Search         = lazy(() => import('./pages/Search'));
const Explore        = lazy(() => import('./pages/Explore'));
const NotFound       = lazy(() => import('./pages/NotFound'));
const Rewards        = lazy(() => import('./pages/Rewards'));
const KYC            = lazy(() => import('./pages/KYC'));
const AdminPanel     = lazy(() => import('./pages/AdminPanel'));
const Live           = lazy(() => import('./pages/Live'));
const Migration      = lazy(() => import('./pages/Migration'));

const Protected = ({ children, creatorOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (creatorOnly && user.role !== 'creator' && user.role !== 'admin') {
    // Fan intentando acceder a página de creador
    return <Navigate to="/feed" replace />;
  }
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/feed" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#17171B',
                color: '#F0F0F5',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#17171B' } },
              error:   { iconTheme: { primary: '#E8365D', secondary: '#17171B' } },
            }}
          />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Públicas */}
              <Route path="/"              element={<Home />} />
              <Route path="/verify-email"  element={<VerifyEmail />} />
              <Route path="/login"         element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/register"      element={<PublicOnly><Register /></PublicOnly>} />
              <Route path="/explore"       element={<Layout><Explore /></Layout>} />
              <Route path="/search"        element={<Layout><Search /></Layout>} />
              <Route path="/:username"     element={<Layout><CreatorProfile /></Layout>} />

              {/* Protegidas — todos los usuarios */}
              <Route path="/feed"          element={<Protected><Layout><Feed /></Layout></Protected>} />
              <Route path="/messages"      element={<Protected><Layout><Messages /></Layout></Protected>} />
              <Route path="/messages/:userId" element={<Protected><Layout><Messages /></Layout></Protected>} />
              <Route path="/settings"      element={<Protected><Layout><Settings /></Layout></Protected>} />

              {/* Protegidas — solo creadores */}
              <Route path="/dashboard"     element={<Protected creatorOnly><Layout><Dashboard /></Layout></Protected>} />
              <Route path="/payouts"       element={<Protected creatorOnly><Layout><Payouts /></Layout></Protected>} />
              <Route path="/analytics"     element={<Protected creatorOnly><Layout><Analytics /></Layout></Protected>} />
              <Route path="/content"       element={<Protected creatorOnly><Layout><ContentManager /></Layout></Protected>} />

              <Route path="/rewards"       element={<Protected><Layout><Rewards /></Layout></Protected>} />
              <Route path="/kyc"           element={<Protected><Layout><KYC /></Layout></Protected>} />
              <Route path="/admin"         element={<Protected><Layout><AdminPanel /></Layout></Protected>} />
              <Route path="/live/:channelId"  element={<Layout><Live /></Layout>} />
              <Route path="/migrate"         element={<Protected creatorOnly><Layout><Migration /></Layout></Protected>} />
              <Route path="*"              element={<NotFound />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
