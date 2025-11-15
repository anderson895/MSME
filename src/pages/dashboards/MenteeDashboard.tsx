import axios from 'axios';
import { BookOpen, Calendar, Clock, MessageSquare, Plus, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../hooks/useAuth';

interface MenteeStats {
  totalRevenue: number;
  averageMonthlyRevenue: number;
  attendedSessions: number;
  upcomingSessions: number;
  salesData: Array<{
    month: number;
    year: number;
    revenue: number;
  }>;
}

interface Session {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  mentor: {
    id: string;
    name: string;
  };
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  targetRole: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

const MenteeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MenteeStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesFormData, setSalesFormData] = useState({
    revenue: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [submittingSales, setSubmittingSales] = useState(false);
  const [salesError, setSalesError] = useState('');

  const fetchStats = async () => {
    try {
      const [analyticsResponse, sessionsResponse, announcementsResponse] = await Promise.all([
        axios.get('/analytics/dashboard'),
        axios.get('/sessions'),
        axios.get('/announcements')
      ]);
      
      setStats(analyticsResponse.data.data);
      
      // Filter upcoming sessions for mentee
      const now = new Date();
      const upcoming = sessionsResponse.data.data.filter((session: Session) => 
        new Date(session.date) > now && 
        (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS')
      );
      setUpcomingSessions(upcoming);

      // Filter announcements for MENTEE role (most recent first)
      const menteeAnnouncements = (announcementsResponse.data.data || [])
        .filter((announcement: Announcement) => announcement.targetRole === 'MENTEE')
        .slice(0, 5); // Get latest 5
      setAnnouncements(menteeAnnouncements);
    } catch (error) {
      console.error('Error fetching mentee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesError('');
    
    if (!salesFormData.revenue || parseFloat(salesFormData.revenue) <= 0) {
      setSalesError('Please enter a valid revenue amount');
      return;
    }

    setSubmittingSales(true);
    try {
      await axios.post('/analytics/sales', {
        revenue: parseFloat(salesFormData.revenue),
        month: salesFormData.month,
        year: salesFormData.year
      });
      
      // Reset form
      setSalesFormData({
        revenue: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
      setShowSalesModal(false);
      
      // Refresh stats to show new data
      await fetchStats();
    } catch (error: any) {
      console.error('Error submitting sales data:', error);
      setSalesError(error.response?.data?.message || 'Failed to save sales data. Please try again.');
    } finally {
      setSubmittingSales(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAnnouncementIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('session') || lowerTitle.includes('training') || lowerTitle.includes('workshop')) {
      return { icon: MessageSquare, color: 'blue' };
    } else if (lowerTitle.includes('resource') || lowerTitle.includes('template') || lowerTitle.includes('guide')) {
      return { icon: BookOpen, color: 'green' };
    }
    return { icon: MessageSquare, color: 'blue' };
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₱${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Avg Monthly Revenue',
      value: `₱${(stats?.averageMonthlyRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Sessions Attended',
      value: stats?.attendedSessions || 0,
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      title: 'Upcoming Sessions',
      value: stats?.upcomingSessions || 0,
      icon: Calendar,
      color: 'bg-orange-500'
    }
  ];

  // Format sales data for chart
  const chartData = stats?.salesData?.map(data => ({
    month: `${data.month}/${data.year}`,
    revenue: data.revenue
  })) || [];

  // Sample category data for pie chart
  const categoryData = [
    { name: 'Product Sales', value: 35, color: '#3B82F6' },
    { name: 'Service Sales', value: 30, color: '#10B981' },
    { name: 'Consulting', value: 20, color: '#F59E0B' },
    { name: 'Other', value: 15, color: '#6366F1' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.role === 'MENTEE' ? `Welcome back, ${user?.name}!` : 'Mentee View Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">Here's your sales performance overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Sales Data Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSalesModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Sales Data
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Categories Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent ?? 0 * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
        </div>
        <div className="p-6">
          {announcements.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No announcements available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const { icon: Icon, color } = getAnnouncementIcon(announcement.title);
                const colorConfig = {
                  blue: {
                    bg: 'bg-blue-50',
                    border: 'border-blue-400',
                    icon: 'text-blue-400',
                    title: 'text-blue-800',
                    text: 'text-blue-700',
                    time: 'text-blue-600'
                  },
                  green: {
                    bg: 'bg-green-50',
                    border: 'border-green-400',
                    icon: 'text-green-400',
                    title: 'text-green-800',
                    text: 'text-green-700',
                    time: 'text-green-600'
                  },
                  purple: {
                    bg: 'bg-purple-50',
                    border: 'border-purple-400',
                    icon: 'text-purple-400',
                    title: 'text-purple-800',
                    text: 'text-purple-700',
                    time: 'text-purple-600'
                  }
                };
                const config = colorConfig[color as keyof typeof colorConfig] || colorConfig.blue;

                return (
                  <div key={announcement.id} className={`${config.bg} border-l-4 ${config.border} p-4 rounded-r-lg`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${config.icon}`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className={`text-sm font-medium ${config.title}`}>
                          {announcement.title}
                        </p>
                        <p className={`text-sm ${config.text} mt-1`}>
                          {announcement.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${config.time}`}>
                            {formatTimeAgo(announcement.createdAt)}
                          </p>
                          <p className={`text-xs ${config.time}`}>
                            By {announcement.author.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
        </div>
        <div className="p-6">
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{session.title}</h4>
                    <p className="text-sm text-gray-600">with {session.mentor.name}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(session.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(session.date).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} ({session.duration} min)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      session.status === 'SCHEDULED' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
              
              {upcomingSessions.length > 3 && (
                <div className="text-center pt-4">
                  <button 
                    onClick={() => window.location.href = '/calendar'}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all {upcomingSessions.length} upcoming sessions →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => window.location.href = '/calendar'}
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-6 w-6 text-blue-600" />
              <span className="ml-3 text-sm font-medium text-blue-900">View Schedule</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/resources'}
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-green-600" />
              <span className="ml-3 text-sm font-medium text-green-900">Browse Resources</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/chat'}
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <MessageSquare className="h-6 w-6 text-purple-600" />
              <span className="ml-3 text-sm font-medium text-purple-900">Start Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sales Input Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Sales Data</h2>
              <button
                onClick={() => {
                  setShowSalesModal(false);
                  setSalesError('');
                  setSalesFormData({
                    revenue: '',
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSalesSubmit} className="p-6">
              {salesError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{salesError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salesFormData.revenue}
                    onChange={(e) => setSalesFormData({ ...salesFormData, revenue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={salesFormData.month}
                      onChange={(e) => setSalesFormData({ ...salesFormData, month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      min="2020"
                      max={new Date().getFullYear() + 1}
                      value={salesFormData.year}
                      onChange={(e) => setSalesFormData({ ...salesFormData, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSalesModal(false);
                    setSalesError('');
                    setSalesFormData({
                      revenue: '',
                      month: new Date().getMonth() + 1,
                      year: new Date().getFullYear()
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSales}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingSales ? 'Saving...' : 'Save Sales Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenteeDashboard;