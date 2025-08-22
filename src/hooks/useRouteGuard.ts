import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

interface RoutePermissions {
  [key: string]: string[];
}

const routePermissions: RoutePermissions = {
  // Admin-only routes
  '/admin': ['ADMIN'],
  '/users': ['ADMIN'],
  '/announcements': ['ADMIN'],
  
  // Mentor-only routes
  '/mentor': ['MENTOR'],
  '/mentor/mentees': ['MENTOR'],
  
  // Mentee-only routes
  '/mentee': ['MENTEE'],
  '/mentee/mentors': ['MENTEE'],
  
  // Admin and Mentor routes
  '/sessions': ['ADMIN', 'MENTOR'],
  
  // Shared routes (all authenticated users)
  '/calendar': ['ADMIN', 'MENTOR', 'MENTEE'],
  '/resources': ['ADMIN', 'MENTOR', 'MENTEE'],
  '/chat': ['ADMIN', 'MENTOR', 'MENTEE'],
  '/profile': ['ADMIN', 'MENTOR', 'MENTEE'],
  '/video-call': ['ADMIN', 'MENTOR', 'MENTEE'],
};

export const useRouteGuard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;

    const currentPath = location.pathname;
    
    // Check if current route requires specific permissions
    const requiredRoles = routePermissions[currentPath];
    
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      // User doesn't have permission for this route
      navigate('/unauthorized', { replace: true });
      return;
    }

    // Additional checks for nested routes
    const pathSegments = currentPath.split('/').filter(Boolean);
    
    if (pathSegments.length > 1) {
      const parentPath = `/${pathSegments[0]}`;
      const parentRequiredRoles = routePermissions[parentPath];
      
      if (parentRequiredRoles && !parentRequiredRoles.includes(user.role)) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    }

    // Redirect users to their appropriate dashboard if they're on root
    if (currentPath === '/') {
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin', { replace: true });
          break;
        case 'MENTOR':
          navigate('/mentor', { replace: true });
          break;
        case 'MENTEE':
          navigate('/mentee', { replace: true });
          break;
        default:
          navigate('/unauthorized', { replace: true });
      }
    }
  }, [user, loading, location.pathname, navigate]);

  const hasAccess = (path: string): boolean => {
    if (!user) return false;
    
    const requiredRoles = routePermissions[path];
    return !requiredRoles || requiredRoles.includes(user.role);
  };

  const getAccessibleRoutes = (): string[] => {
    if (!user) return [];
    
    return Object.keys(routePermissions).filter(path => 
      routePermissions[path].includes(user.role)
    );
  };

  return {
    hasAccess,
    getAccessibleRoutes,
    routePermissions
  };
};