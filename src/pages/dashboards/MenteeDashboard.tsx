import axios from 'axios';
import { BookOpen, Calendar, Clock, MessageSquare, TrendingUp } from 'lucide-react';
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
const MenteeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MenteeStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticsResponse, sessionsResponse] = await Promise.all([
          axios.get('/analytics/dashboard'),
          axios.get('/sessions')
        ]);
        
        setStats(analyticsResponse.data.data);
        
        // Filter upcoming sessions for mentee
        const now = new Date();
        const upcoming = sessionsResponse.data.data.filter((session: Session) => 
          new Date(session.date) > now && 
          (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS')
        );
        setUpcomingSessions(upcoming);
      } catch (error) {
        console.error('Error fetching mentee stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Avg Monthly Revenue',
      value: `$${(stats?.averageMonthlyRevenue || 0).toLocaleString()}`,
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
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
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
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    New Training Session Available
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Join our upcoming "Advanced Sales Techniques" session scheduled for next week.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">2 hours ago</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    New Resources Added
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Check out the new sales templates and guides in the resource library.
                  </p>
                  <p className="text-xs text-green-600 mt-2">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default MenteeDashboard;