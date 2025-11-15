import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Bell, 
  BellOff,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

interface Announcement {
  id: string;
  title: string;
  message: string;
  targetRole: 'ADMIN' | 'MENTOR' | 'MENTEE';
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
}

interface FilterOptions {
  targetRole: 'ALL' | 'MENTOR' | 'MENTEE';
  timeRange: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
  search: string;
}

const MentorAnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    targetRole: 'ALL',
    timeRange: 'ALL',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
    fetchReadStatus();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [announcements, filters]);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('/announcements');
      setAnnouncements(response.data.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadStatus = async () => {
    try {
      const response = await axios.get('/announcements/read-status');
      const readIds = response.data.data || [];
      setReadAnnouncements(new Set(readIds));
    } catch (error) {
      console.error('Error fetching read status:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...announcements];

    // Filter by target role
    if (filters.targetRole !== 'ALL') {
      filtered = filtered.filter(a => a.targetRole === filters.targetRole);
    }

    // Filter by time range
    if (filters.timeRange !== 'ALL') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.timeRange) {
        case 'TODAY':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'WEEK':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'MONTH':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(a => new Date(a.createdAt) >= filterDate);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.message.toLowerCase().includes(searchLower) ||
        a.author.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredAnnouncements(filtered);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleReadStatus = async (id: string) => {
    const isCurrentlyRead = readAnnouncements.has(id);
    
    try {
      if (isCurrentlyRead) {
        // Mark as unread
        await axios.delete(`/announcements/${id}/read`);
        setReadAnnouncements(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        // Mark as read
        await axios.post(`/announcements/${id}/read`);
        setReadAnnouncements(prev => {
          const newSet = new Set(prev);
          newSet.add(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling read status:', error);
      // Optionally show an error message to the user
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'MENTOR':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'MENTEE':
        return <Info className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'MENTOR':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'MENTEE':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const announcementDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - announcementDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return announcementDate.toLocaleDateString();
  };

  const unreadCount = filteredAnnouncements.filter(a => !readAnnouncements.has(a.id)).length;
  const mentorSpecificCount = filteredAnnouncements.filter(a => a.targetRole === 'MENTOR').length;
  const generalCount = filteredAnnouncements.filter(a => a.targetRole === 'MENTEE').length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start space-x-4">
                <div className="h-12 w-12 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Megaphone className="h-8 w-8" />
              <span>Announcements</span>
            </h1>
            <p className="text-blue-100 mt-2">
              Stay updated with important news and updates from administrators
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{filteredAnnouncements.length}</div>
            <div className="text-blue-100 text-sm">Total Announcements</div>
            {unreadCount > 0 && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-yellow-500 text-white text-sm font-medium">
                <Bell className="h-4 w-4 mr-1" />
                {unreadCount} unread
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700">Filters</span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  value={filters.targetRole}
                  onChange={(e) => handleFilterChange('targetRole', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Audiences</option>
                  <option value="MENTOR">Mentors Only</option>
                  <option value="MENTEE">General Announcements</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => {
          const isRead = readAnnouncements.has(announcement.id);
          const isExpanded = expandedAnnouncements.has(announcement.id);
          const isNew = !isRead && new Date(announcement.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

          return (
            <div
              key={announcement.id}
              className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                isRead ? 'border-gray-200' : 'border-blue-200 bg-blue-50/30'
              } ${isNew ? 'ring-2 ring-blue-200' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${isRead ? 'bg-gray-100' : 'bg-blue-100'}`}>
                    {isRead ? (
                      <CheckCircle className="h-6 w-6 text-gray-500" />
                    ) : (
                      <Bell className="h-6 w-6 text-blue-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`text-lg font-semibold ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                            {announcement.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(announcement.targetRole)}`}>
                            {getRoleIcon(announcement.targetRole)}
                            <span className="ml-1">{announcement.targetRole}</span>
                          </span>
                          {isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          )}
                        </div>

                        <p className={`text-sm mb-3 ${isRead ? 'text-gray-600' : 'text-gray-700'} ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {announcement.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>By {announcement.author.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{getTimeAgo(announcement.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {announcement.message.length > 150 && (
                              <button
                                onClick={() => toggleExpanded(announcement.id)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                              >
                                <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                            
                            <button
                              onClick={() => toggleReadStatus(announcement.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isRead 
                                  ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                              }`}
                              title={isRead ? 'Mark as unread' : 'Mark as read'}
                            >
                              {isRead ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
          <p className="text-gray-500">
            {filters.search || filters.targetRole !== 'ALL' || filters.timeRange !== 'ALL'
              ? 'Try adjusting your filters to see more announcements.'
              : 'No announcements have been posted yet.'}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{unreadCount}</div>
              <div className="text-sm text-gray-600">Unread</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{readAnnouncements.size}</div>
              <div className="text-sm text-gray-600">Read</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{mentorSpecificCount}</div>
              <div className="text-sm text-gray-600">Mentor Specific</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Info className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{generalCount}</div>
              <div className="text-sm text-gray-600">General</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorAnnouncementsPage;
