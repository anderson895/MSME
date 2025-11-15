import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { useAuth } from './hooks/useAuth';

// Layout components
import Layout from './components/Layout/Layout';

// Authentication pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard pages
import AdminDashboard from './pages/dashboards/AdminDashboard';
import MentorDashboard from './pages/dashboards/MentorDashboard';
import MenteeDashboard from './pages/dashboards/MenteeDashboard';

// Feature pages
import SessionsPage from './pages/SessionsPage';
import UsersPage from './pages/UsersPage';
import ResourcesPage from './pages/ResourcesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import MentorAnnouncementsPage from './pages/MentorAnnouncementsPage';
import CalendarPage from './pages/CalendarPage';
import VideoCallPage from './pages/VideoCallPage';
import MentorsPage from './pages/MentorsPage';
import MenteesPage from './pages/MenteesPage';

// Announcements wrapper component
const AnnouncementsWrapper: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'ADMIN') {
    return <AnnouncementsPage />;
  } else if (user?.role === 'MENTOR') {
    return <MentorAnnouncementsPage />;
  }
  
  return <AnnouncementsPage />;
};

// Unauthorized page component
const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
      <button
        onClick={() => window.history.back()}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ 
  children, 
  roles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if mentee account needs email verification
  if (user.role === 'MENTEE' && !user.verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="bg-yellow-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verification Required</h2>
          <p className="text-gray-600 mb-6">
            Please verify your email address to access your dashboard. Check your inbox for the verification link we sent you.
          </p>
          <button
            onClick={() => {
              // Clear auth data and navigate to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if account is pending approval (for both MENTOR and MENTEE)
  if (user.status === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="bg-yellow-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account is currently pending admin approval. You will be notified once your account has been approved and you can access the platform.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Enhanced role-based access control
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Route access control helper
const getAccessibleRoutes = (userRole: string) => {
  const routes = {
    ADMIN: [
      '/admin', '/users', '/sessions', '/announcements', 
      '/calendar', '/resources', '/chat', '/profile', '/video-call'
    ],
    MENTOR: [
      '/mentor', '/mentor/mentees', '/sessions', '/announcements', '/calendar', 
      '/resources', '/chat', '/profile', '/video-call'
    ],
    MENTEE: [
      '/mentee', '/mentee/mentors', '/calendar', '/resources', 
      '/chat', '/profile', '/video-call'
    ]
  };
  
  return routes[userRole as keyof typeof routes] || [];
};

// Route guard component
const RouteGuard: React.FC<{ children: React.ReactNode; path: string }> = ({ 
  children, 
  path 
}) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const accessibleRoutes = getAccessibleRoutes(user.role);
  const hasAccess = accessibleRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  );
  
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// Navigation blocker component to prevent leaving active calls
const NavigationBlocker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prevLocationRef = React.useRef(location.pathname);

  useEffect(() => {
    // Check if user is trying to navigate away from video-call page
    const isCallActive = sessionStorage.getItem('isCallActive') === 'true';
    const allowNavigation = sessionStorage.getItem('allowNavigation') === 'true';
    
    if (isCallActive && !allowNavigation && prevLocationRef.current === '/video-call' && location.pathname !== '/video-call') {
      // Block navigation and show confirmation
      const confirmed = window.confirm('You have an active call. Ending the call will disconnect you. Do you want to end the call and navigate?');
      if (confirmed) {
        // Allow navigation
        sessionStorage.setItem('isCallActive', 'false');
        sessionStorage.setItem('allowNavigation', 'true');
        // Navigation will proceed naturally
      } else {
        // Navigate back to video-call page
        navigate('/video-call', { replace: true });
      }
    } else if (allowNavigation) {
      // Clear the allow navigation flag after use
      sessionStorage.removeItem('allowNavigation');
    }
    
    prevLocationRef.current = location.pathname;
  }, [location.pathname, navigate]);

  return null;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const getDashboard = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'MENTOR':
        return '/mentor';
      case 'MENTEE':
        return '/mentee';
      default:
        return '/login';
    }
  };

  return (
    <>
      <NavigationBlocker />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={getDashboard()} />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to={getDashboard()} />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to={getDashboard()} />} />
      <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to={getDashboard()} />} />
      
      {/* Protected routes with layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Redirect root to appropriate dashboard */}
        <Route index element={<Navigate to={getDashboard()} replace />} />
        
        {/* Admin-only routes */}
        <Route path="admin" element={
          <RouteGuard path="/admin">
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="users" element={
          <RouteGuard path="/users">
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="announcements" element={
          <RouteGuard path="/announcements">
            <ProtectedRoute roles={['ADMIN', 'MENTOR']}>
              <AnnouncementsWrapper />
            </ProtectedRoute>
          </RouteGuard>
        } />
        
        {/* Mentor-only routes */}
        <Route path="mentor" element={
          <RouteGuard path="/mentor">
            <ProtectedRoute roles={['MENTOR']}>
              <MentorDashboard />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="mentor/mentees" element={
          <RouteGuard path="/mentor/mentees">
            <ProtectedRoute roles={['MENTOR']}>
              <MenteesPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        
        {/* Mentee-only routes */}
        <Route path="mentee" element={
          <RouteGuard path="/mentee">
            <ProtectedRoute roles={['MENTEE']}>
              <MenteeDashboard />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="mentee/mentors" element={
          <RouteGuard path="/mentee/mentors">
            <ProtectedRoute roles={['MENTEE']}>
              <MentorsPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        
        {/* Sessions route - accessible by Admin and Mentor only */}
        <Route path="sessions" element={
          <RouteGuard path="/sessions">
            <ProtectedRoute roles={['ADMIN', 'MENTOR']}>
              <SessionsPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        
        {/* Shared routes - accessible by all authenticated users */}
        <Route path="calendar" element={
          <RouteGuard path="/calendar">
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="video-call" element={
          <RouteGuard path="/video-call">
            <ProtectedRoute>
              <VideoCallPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="resources" element={
          <RouteGuard path="/resources">
            <ProtectedRoute>
              <ResourcesPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="chat" element={
          <RouteGuard path="/chat">
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          </RouteGuard>
        } />
        <Route path="profile" element={
          <RouteGuard path="/profile">
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </RouteGuard>
        } />
      </Route>

      {/* Error routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;