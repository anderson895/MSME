import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const RoleSwitcher: React.FC = () => {
  const { user } = useAuth();

  // Role switcher is now disabled for enhanced security
  // Users can only access routes appropriate to their assigned role
  if (!user) {
    return null;
  }

  // Display current user role for reference
  return (
    <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          user.role === 'ADMIN' ? 'bg-red-500' :
          user.role === 'MENTOR' ? 'bg-blue-500' : 'bg-green-500'
        }`}></div>
        <span className="text-sm font-medium text-gray-700 capitalize">
          {user.role.toLowerCase()}
        </span>
      </div>
    </div>
  );
};

export default RoleSwitcher;