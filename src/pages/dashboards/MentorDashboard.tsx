import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Calendar, Star, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

interface MentorStats {
  assignedMentees: number;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  uploadedResources: number;
}

interface Session {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  mentees: Array<{
    mentee: {
      id: string;
      name: string;
    };
  }>;
}

interface Rating {
  id: string;
  score: number;
  comment?: string;
  createdAt: string;
  mentee: {
    id: string;
    name: string;
  };
}

const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MentorStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsResponse, sessionsResponse, ratingsResponse] = await Promise.all([
          axios.get('/analytics/dashboard'),
          axios.get('/sessions'),
          axios.get('/ratings')
        ]);
        
        setStats(analyticsResponse.data.data);
        
        // Filter upcoming sessions (future dates, scheduled or in progress)
        const now = new Date();
        const upcoming = sessionsResponse.data.data
          .filter((session: Session) => {
            const sessionDate = new Date(session.date);
            return sessionDate > now && 
                   (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS');
          })
          .sort((a: Session, b: Session) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(0, 5); // Get top 5 upcoming
        
        setUpcomingSessions(upcoming);
        
        // Get recent ratings (last 5)
        const ratings = ratingsResponse.data.data
          .slice(0, 5);
        setRecentRatings(ratings);
      } catch (error) {
        console.error('Error fetching mentor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's this week
    const daysDiff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff < 7) {
      const dayName = date.toLocaleDateString([], { weekday: 'long' });
      return `${dayName} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, show full date
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => {
                const menteeNames = session.mentees.map(m => m.mentee.name).join(', ');
                const bgColor = session.status === 'SCHEDULED' ? 'bg-blue-50' : 'bg-yellow-50';
                
                return (
                  <div key={session.id} className={`flex items-center justify-between p-4 ${bgColor} rounded-lg`}>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{session.title}</p>
                      {menteeNames && (
                        <p className="text-sm text-gray-600 mt-1">with {menteeNames}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(session.date)}</span>
                        </div>
                        <span>({session.duration} min)</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
        </div>
        <div className="p-6">
          {recentRatings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No feedback received yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRatings.map((rating) => (
                <div key={rating.id} className="border-l-4 border-yellow-400 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < rating.score ? 'fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">from {rating.mentee.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-gray-700 mt-1">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;