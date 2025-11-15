import {
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  User,
  Users
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCallActive, setIsCallActive] = useState(false);

  // Check if there's an active call
  useEffect(() => {
    const checkCallActive = () => {
      const callActive = sessionStorage.getItem('isCallActive') === 'true';
      setIsCallActive(callActive);
    };
    
    checkCallActive();
    const interval = setInterval(checkCallActive, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Enhanced navigation items with strict role-based access
  const getNavigationItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'ADMIN':
        return [
          {
            name: 'Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
            roles: ['ADMIN']
          },
          {
            name: 'Users',
            href: '/users',
            icon: Users,
            roles: ['ADMIN']
          },
          {
            name: 'Sessions',
            href: '/sessions',
            icon: Calendar,
            roles: ['ADMIN']
          },
          {
            name: 'Announcements',
            href: '/announcements',
            icon: Megaphone,
            roles: ['ADMIN']
          },
          {
            name: 'Calendar',
            href: '/calendar',
            icon: Calendar,
            roles: ['ADMIN']
          },
          {
            name: 'Resources',
            href: '/resources',
            icon: BookOpen,
            roles: ['ADMIN']
          },
          {
            name: 'Chat',
            href: '/chat',
            icon: MessageSquare,
            roles: ['ADMIN']
          },
          {
            name: 'Profile',
            href: '/profile',
            icon: User,
            roles: ['ADMIN']
          }
        ];
        
      case 'MENTOR':
        return [
          {
            name: 'Dashboard',
            href: '/mentor',
            icon: LayoutDashboard,
            roles: ['MENTOR']
          },
          {
            name: 'List of Mentees',
            href: '/mentor/mentees',
            icon: Users,
            roles: ['MENTOR']
          },
          {
            name: 'Sessions',
            href: '/sessions',
            icon: Calendar,
            roles: ['MENTOR']
          },
          {
            name: 'Announcements',
            href: '/announcements',
            icon: Megaphone,
            roles: ['MENTOR']
          },
          {
            name: 'Calendar',
            href: '/calendar',
            icon: Calendar,
            roles: ['MENTOR']
          },
          {
            name: 'Resources',
            href: '/resources',
            icon: BookOpen,
            roles: ['MENTOR']
          },
          {
            name: 'Chat',
            href: '/chat',
            icon: MessageSquare,
            roles: ['MENTOR']
          },
          {
            name: 'Profile',
            href: '/profile',
            icon: User,
            roles: ['MENTOR']
          }
        ];
        
      case 'MENTEE':
        return [
          {
            name: 'Dashboard',
            href: '/mentee',
            icon: LayoutDashboard,
            roles: ['MENTEE']
          },
          {
            name: 'My Mentors',
            href: '/mentee/mentors',
            icon: Users,
            roles: ['MENTEE']
          },
          {
            name: 'Calendar',
            href: '/calendar',
            icon: Calendar,
            roles: ['MENTEE']
          },
          {
            name: 'Resources',
            href: '/resources',
            icon: BookOpen,
            roles: ['MENTEE']
          },
          {
            name: 'Chat',
            href: '/chat',
            icon: MessageSquare,
            roles: ['MENTEE']
          },
          {
            name: 'Profile',
            href: '/profile',
            icon: User,
            roles: ['MENTEE']
          }
        ];
        
      default:
        return [];
    }

  };


  const navigationItems = getNavigationItems();
  
  // Prevent rendering if user is not authenticated
  if (!user) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <aside className="bg-white w-64 min-h-screen fixed left-0 top-0 z-40 shadow-lg border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">MentorHub</h1>
            <p className="text-xs text-gray-500">Training System</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        <div className="px-6 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Navigation
          </h2>
        </div>
        
        <div className="space-y-1 px-3">
          {navigationItems.map((item) => {
            // Double-check role access for security
            if (!item.roles.includes(user.role)) return null;
            
            const isActive = location.pathname === item.href;
            
            const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
              // If call is active and not already on video-call page, prevent navigation
              if (isCallActive && location.pathname === '/video-call' && item.href !== '/video-call') {
                e.preventDefault();
                const confirmed = window.confirm('You have an active call. Ending the call will disconnect you. Do you want to end the call and navigate?');
                if (confirmed) {
                  // Set flag to allow navigation, then navigate
                  sessionStorage.setItem('isCallActive', 'false');
                  sessionStorage.setItem('allowNavigation', 'true');
                  navigate(item.href);
                }
              }
            };

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavigation}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${isCallActive && location.pathname === '/video-call' && item.href !== '/video-call' 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                  }
                `}
              >
                <item.icon 
                  className={`
                    mr-3 h-5 w-5 transition-colors
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} 
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;