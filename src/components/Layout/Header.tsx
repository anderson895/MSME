import React, { useState, useEffect } from 'react';
import { Bell, Search, User, LogOut, X, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../contexts/SocketContext';
import RoleSwitcher from './RoleSwitcher';
import axios from 'axios';
import { getAvatarUrl } from '../../utils/avatarUtils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  senderId?: string;
  senderName?: string;
}

interface SocketNotification {
  title: string;
  message: string;
  type: string;
  senderId?: string;
  senderName?: string;
  timestamp?: string;
  sessionId?: string;
  meetingUrl?: string;
  announcementId?: string;
}

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications: socketNotifications, clearNotifications } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  // Hide "Schedule Session" button on calendar page (view-only)
  const isCalendarPage = location.pathname === '/calendar';
  const showScheduleButton = !isCalendarPage && (user?.role === 'ADMIN' || user?.role === 'MENTOR');

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Refetch unread count when new socket notifications arrive
  // This ensures accuracy since database is the source of truth
  useEffect(() => {
    if (socketNotifications.length > 0) {
      // Small delay to ensure database notification is created
      const timeoutId = setTimeout(() => {
        fetchUnreadCount();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [socketNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/notifications/unread-count');
      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      clearNotifications(); // Clear socket notifications
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📢';
    }
  };

  const handleNotificationClick = async (notification: Notification | SocketNotification, isSocketNotification: boolean = false) => {
    // Mark as read if it's a database notification
    if (!isSocketNotification && 'id' in notification && !notification.read) {
      await markAsRead(notification.id);
    }

    setShowNotifications(false);

    // Handle navigation based on notification type
    if (notification.title === 'New Message') {
      navigate('/chat');
      
      // Use senderId if available, otherwise extract from message
      const senderId = notification.senderId;
      const senderName = notification.senderName || (() => {
        const senderMatch = notification.message.match(/from (.+)$/);
        return senderMatch ? senderMatch[1].trim() : null;
      })();
      
      // Small delay to ensure chat page is loaded, then select the user
      setTimeout(() => {
        if (senderId) {
          window.dispatchEvent(new CustomEvent('selectChatUser', { detail: { id: senderId, name: senderName } }));
        } else if (senderName) {
          window.dispatchEvent(new CustomEvent('selectChatUser', { detail: { name: senderName } }));
        }
      }, 300);
    } else if (notification.title === 'Session Started' || notification.title.includes('Session')) {
      // Handle session notifications - navigate to meeting URL or session page
      const socketNotification = notification as SocketNotification;
      
      console.log('[Notification] Session notification clicked:', {
        title: notification.title,
        meetingUrl: socketNotification.meetingUrl,
        sessionId: socketNotification.sessionId,
        isSocketNotification
      });
      
      // Close notification dropdown first
      setShowNotifications(false);
      
      if (socketNotification.meetingUrl) {
        // Extract the path from the full URL if it's a full URL
        let urlToNavigate = socketNotification.meetingUrl;
        
        // If it's a full URL, extract just the path and query params
        if (socketNotification.meetingUrl.startsWith('http')) {
          try {
            const url = new URL(socketNotification.meetingUrl);
            urlToNavigate = url.pathname + url.search;
            console.log('[Notification] Extracted path from full URL:', {
              original: socketNotification.meetingUrl,
              extracted: urlToNavigate
            });
          } catch (error) {
            console.warn('[Notification] Failed to parse URL, trying manual extraction:', error);
            // If URL parsing fails, try to extract path manually
            const match = socketNotification.meetingUrl.match(/\/video-call\?.*/);
            if (match) {
              urlToNavigate = match[0];
              console.log('[Notification] Extracted path using regex:', urlToNavigate);
            } else {
              // Fallback: just use the path part
              urlToNavigate = socketNotification.meetingUrl.replace(/^https?:\/\/[^/]+/, '');
              console.log('[Notification] Using fallback path extraction:', urlToNavigate);
            }
          }
        }
        
        console.log('[Notification] Navigating to:', urlToNavigate);
        // Navigate in the same tab (don't open new tab for better context sharing)
        navigate(urlToNavigate);
      } else if (socketNotification.sessionId) {
        const videoCallUrl = `/video-call?sessionId=${socketNotification.sessionId}`;
        console.log('[Notification] No meetingUrl, using sessionId to navigate:', videoCallUrl);
        // Fallback: navigate to video call with sessionId
        navigate(videoCallUrl);
      } else {
        console.warn('[Notification] No meetingUrl or sessionId, navigating to calendar');
        // For database notifications without sessionId/meetingUrl, navigate to calendar
        // where they can see and join active sessions
        navigate('/calendar');
      }
    } else if (notification.title === 'New Announcement' || notification.title.includes('Announcement')) {
      // Handle announcement notifications - navigate to announcements page
      const socketNotification = notification as SocketNotification;
      if (socketNotification.announcementId) {
        // Navigate to announcements page (could add specific announcement ID in future)
        navigate('/announcements');
      } else {
        // Navigate to announcements page
        navigate('/announcements');
      }
    } else {
      // For other notification types, just close the dropdown
      // (already closed above)
    }
  };

  const totalUnreadCount = unreadCount + socketNotifications.length;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-64 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Role indicator */}
            <RoleSwitcher />
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
              >
                <Bell className="h-5 w-5" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    <div className="flex items-center space-x-2">
                      {totalUnreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (
                      <>
                        {/* Socket Notifications (Real-time) */}
                        {socketNotifications.map((notification, index) => {
                          const timestamp = notification.timestamp 
                            ? new Date(notification.timestamp).toLocaleString()
                            : 'Just now';
                          
                          return (
                            <div 
                              key={`socket-${index}`} 
                              className="p-4 border-b border-gray-100 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                              onClick={() => handleNotificationClick(notification, true)}
                            >
                              <div className="flex items-start space-x-3">
                                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">{timestamp}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Database Notifications */}
                        {notifications.length === 0 && socketNotifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div 
                              key={notification.id} 
                              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleNotificationClick(notification, false)}
                            >
                              <div className="flex items-start space-x-3">
                                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    !notification.read ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Schedule Session Button - Hidden on calendar page */}
              {showScheduleButton && (
                <button
                  onClick={() => {
                    // Check if call is active before navigating
                    if (isCallActive && location.pathname === '/video-call') {
                      const confirmed = window.confirm('You have an active call. Ending the call will disconnect you. Do you want to end the call and navigate?');
                      if (confirmed) {
                        sessionStorage.setItem('isCallActive', 'false');
                        sessionStorage.setItem('allowNavigation', 'true');
                        navigate('/sessions');
                      }
                    } else {
                      navigate('/sessions');
                    }
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isCallActive && location.pathname === '/video-call'
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title="Create Training Session"
                  disabled={isCallActive && location.pathname === '/video-call'}
                >
                  <Plus className="h-4 w-4" />
                  <span>Schedule Session</span>
                </button>
              )}

              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</p>
              </div>
              
              {user?.avatar ? (
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    // Fallback to default avatar on error
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;