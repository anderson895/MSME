import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Calendar, Star, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

interface MentorStats {
  assignedMentees: number;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  uploadedResources: number;
}

const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MentorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/analytics/dashboard');
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching mentor stats:', error);
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
      title: 'Assigned Mentees',
      value: stats?.assignedMentees || 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Sessions',
      value: stats?.totalSessions || 0,
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      title: 'Average Rating',
      value: (stats?.averageRating || 0).toFixed(1),
      icon: Star,
      color: 'bg-yellow-500'
    },
    {
      title: 'Resources Uploaded',
      value: stats?.uploadedResources || 0,
      icon: BookOpen,
      color: 'bg-purple-500'
    }
  ];

  const sessionData = [
    { name: 'Completed', count: stats?.completedSessions || 0 },
    { name: 'Pending', count: (stats?.totalSessions || 0) - (stats?.completedSessions || 0) }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.role === 'ADMIN' ? 'Mentor View Dashboard' : 'Mentor Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">Track your mentoring progress and impact</p>
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

      {/* Session Overview Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sessionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Sales Strategy Session</p>
                <p className="text-sm text-gray-600">with John Doe</p>
                <p className="text-xs text-gray-500">Tomorrow at 2:00 PM</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Scheduled
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Product Training</p>
                <p className="text-sm text-gray-600">with Jane Smith, Mike Johnson</p>
                <p className="text-xs text-gray-500">Friday at 10:00 AM</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-400 pl-4">
              <div className="flex items-center space-x-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">from Sarah Wilson</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                "Excellent mentorship! Really helped me understand the sales process better."
              </p>
            </div>
            
            <div className="border-l-4 border-yellow-400 pl-4">
              <div className="flex items-center space-x-2">
                <div className="flex text-yellow-400">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                  <Star className="h-4 w-4 text-gray-300" />
                </div>
                <span className="text-sm text-gray-600">from Tom Brown</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                "Very knowledgeable and patient. Would recommend to anyone!"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;