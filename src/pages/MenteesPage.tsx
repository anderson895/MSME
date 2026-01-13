/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { Calendar, MessageCircle, Minus, Search, TrendingDown, TrendingUp, Users, Video, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatarUtils';

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  lastActive?: string;
  progress: number;
  totalSessions: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const MenteesPage: React.FC = () => {
  const navigate = useNavigate();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingRevenue, setViewingRevenue] = useState<{ userId: string; userName: string } | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ month: number; year: number; revenue: number; label: string }>>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  useEffect(() => {
    fetchMentees();
  }, []);

  const fetchMentees = async () => {
    try {
      // Fetch mentees and sessions in parallel
      const [menteesResponse, sessionsResponse] = await Promise.all([
        axios.get('/users?role=MENTEE&status=ACTIVE'),
        axios.get('/sessions')
      ]);

      const menteesData = menteesResponse.data.data;
      const sessionsData = sessionsResponse.data.data;

      // Calculate statistics for each mentee
      const menteesWithProgress = menteesData.map((mentee: any) => {
        // Find all sessions for this mentee
        const menteeSessions = sessionsData.filter((session: any) =>
          session.mentees?.some((sm: any) => sm.mentee?.id === mentee.id)
        );

        // Calculate total sessions
        const totalSessions = menteeSessions.length;

        // Get sessions where mentee actually attended (attended: true) AND session is completed
        const attendedSessionsList = menteeSessions.filter((session: any) => {
          const sessionMentee = session.mentees?.find((sm: any) => sm.mentee?.id === mentee.id);
          return session.status === 'COMPLETED' && sessionMentee?.attended === true;
        });
        
        // Calculate attended sessions count
        const attendedSessionsCount = attendedSessionsList.length;

        // Calculate progress percentage (attended / total * 100)
        const progress = totalSessions > 0 
          ? Math.round((attendedSessionsCount / totalSessions) * 100)
          : 0;

        // Find last active date from most recent attended session (not scheduled/future sessions)
        const lastActiveSession = attendedSessionsList
          .filter((session: any) => session.date)
          .sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

        // Only use attended session dates, fallback to createdAt if no attended sessions
        const lastActive = lastActiveSession?.date 
          ? new Date(lastActiveSession.date).toISOString()
          : mentee.createdAt;

        return {
          ...mentee,
          joinedAt: mentee.createdAt,
          progress,
          totalSessions,
          lastActive
        };
      });

      setMentees(menteesWithProgress);
    } catch (error) {
      console.error('Error fetching mentees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (mentee: Mentee) => {
    // Navigate to chat with mentee
    navigate(`/chat?mentee=${mentee.id}`);
  };

  const handleStartVideoCall = (mentee: Mentee) => {
    // Navigate to video call with mentee
    navigate(`/video-call?mentee=${mentee.id}`);
  };

  const handleViewProgress = (mentee: Mentee) => {
    // Navigate to mentee's progress page
    navigate(`/mentee-progress/${mentee.id}`);
  };

  const handleViewRevenueTrend = async (mentee: Mentee) => {
    setViewingRevenue({ userId: mentee.id, userName: mentee.name });
    setLoadingRevenue(true);
    try {
      const response = await axios.get(`/analytics/sales/${mentee.id}`);
      const salesData = response.data.data || [];
      
      // Format data for chart
      const formattedData = salesData.map((item: any) => ({
        month: item.month,
        year: item.year,
        revenue: item.revenue,
        label: `${new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' })} ${item.year}`
      })).sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      
      setRevenueData(formattedData);
    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
      alert(error.response?.data?.message || 'Failed to fetch revenue data');
      setViewingRevenue(null);
    } finally {
      setLoadingRevenue(false);
    }
  };

  const calculateImprovement = () => {
    if (revenueData.length < 2) return null;
    
    const firstRevenue = revenueData[0].revenue;
    const lastRevenue = revenueData[revenueData.length - 1].revenue;
    const difference = lastRevenue - firstRevenue;
    const percentage = firstRevenue > 0 ? (difference / firstRevenue) * 100 : 0;
    
    return {
      difference,
      percentage: Math.abs(percentage),
      isImproving: difference > 0,
      isDeclining: difference < 0,
      isStable: difference === 0
    };
  };

  const filteredMentees = mentees.filter(mentee =>
    mentee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">List of Mentees</h1>
        <p className="text-gray-600 mt-2">Manage and track your mentees' progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Mentees</p>
              <p className="text-2xl font-bold text-gray-900">{mentees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(mentees.reduce((acc, m) => acc + m.progress, 0) / mentees.length || 0)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentees.reduce((acc, m) => acc + m.totalSessions, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-orange-500 p-3 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active This Week</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentees.filter(m => 
                  new Date(m.lastActive || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search mentees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Mentees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMentees.map((mentee) => (
          <div key={mentee.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xl font-medium">
                    {mentee.name.charAt(0)}
                  </span>
                </div>
                {mentee.avatar && (
                  <img
                    src={getAvatarUrl(mentee.avatar)}
                    alt={mentee.name}
                    className="w-16 h-16 rounded-full object-cover absolute top-0 left-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-lg font-medium text-gray-900 truncate leading-tight">{mentee.name}</h3>
                <p className="text-sm text-gray-600 truncate leading-tight">{mentee.email}</p>
                <p className="text-xs text-gray-500 truncate leading-tight">
                  Joined {new Date(mentee.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{mentee.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(mentee.progress)}`}
                  style={{ width: `${mentee.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{mentee.totalSessions}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {mentee.lastActive ? 
                    (() => {
                      const now = Date.now();
                      const lastActiveTime = new Date(mentee.lastActive).getTime();
                      const diffInDays = Math.floor((now - lastActiveTime) / (1000 * 60 * 60 * 24));
                      // Ensure we return a positive number (if lastActive is in future, show 0)
                      return diffInDays >= 0 ? diffInDays : 0;
                    })()
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-gray-500">Days ago</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleStartChat(mentee)}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </button>
              
              <button
                onClick={() => handleStartVideoCall(mentee)}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Video className="h-4 w-4" />
                <span>Call</span>
              </button>
              
              <button
                onClick={() => handleViewRevenueTrend(mentee)}
                className="flex items-center justify-center bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                title="View Revenue Trend"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMentees.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No mentees found matching your search</p>
        </div>
      )}

      {/* Revenue Trend Modal */}
      {viewingRevenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mentee's Revenue Trend</h3>
                <p className="text-sm text-gray-500 mt-1">{viewingRevenue.userName}</p>
              </div>
              <button
                onClick={() => {
                  setViewingRevenue(null);
                  setRevenueData([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {loadingRevenue ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : revenueData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <TrendingUp className="h-16 w-16 mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No Revenue Data Available</p>
                  <p className="text-sm">This mentee has not submitted any sales data yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Improvement Indicator */}
                  {calculateImprovement() && (() => {
                    const improvement = calculateImprovement()!;
                    return (
                      <div className={`p-4 rounded-lg border-2 ${
                        improvement.isImproving 
                          ? 'bg-green-50 border-green-200' 
                          : improvement.isDeclining 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {improvement.isImproving && (
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          )}
                          {improvement.isDeclining && (
                            <TrendingDown className="h-6 w-6 text-red-600" />
                          )}
                          {improvement.isStable && (
                            <Minus className="h-6 w-6 text-gray-600" />
                          )}
                          <div>
                            <p className={`font-semibold ${
                              improvement.isImproving 
                                ? 'text-green-900' 
                                : improvement.isDeclining 
                                ? 'text-red-900' 
                                : 'text-gray-900'
                            }`}>
                              {improvement.isImproving 
                                ? `Revenue Increased by ${improvement.percentage.toFixed(1)}%` 
                                : improvement.isDeclining 
                                ? `Revenue Decreased by ${improvement.percentage.toFixed(1)}%` 
                                : 'Revenue Remains Stable'}
                            </p>
                            <p className={`text-sm ${
                              improvement.isImproving 
                                ? 'text-green-700' 
                                : improvement.isDeclining 
                                ? 'text-red-700' 
                                : 'text-gray-700'
                            }`}>
                              {improvement.difference > 0 ? '+' : ''}₱{Math.abs(improvement.difference).toLocaleString()} 
                              {' '}from first to last recorded period
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Revenue Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ₱{revenueData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-600 mb-1">Average Monthly</p>
                      <p className="text-2xl font-bold text-green-900">
                        ₱{(revenueData.reduce((sum, item) => sum + item.revenue, 0) / revenueData.length).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-600 mb-1">Data Points</p>
                      <p className="text-2xl font-bold text-purple-900">{revenueData.length}</p>
                    </div>
                  </div>

                  {/* Revenue Trend Chart */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Revenue Trend Over Time</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="label" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#9333EA" 
                          strokeWidth={3}
                          dot={{ fill: '#9333EA', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue Data Table */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Monthly Revenue Details</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Period
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {item.label}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₱{item.revenue.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setViewingRevenue(null);
                  setRevenueData([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenteesPage;