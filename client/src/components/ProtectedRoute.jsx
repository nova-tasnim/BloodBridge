import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route element. Redirects to /login if nobody is signed in.
 * If `roles` is provided, also requires the signed-in user's role to
 * be in that list (e.g. roles={['Admin']} for the admin dashboard) —
 * otherwise redirects to /donors instead of showing a 403 blank page.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/donors" replace />;
  }

  return children;
}