/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { Calendar, MessageCircle, Search, TrendingUp, Users, Video } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMentees();
  }, []);

  const fetchMentees = async () => {
    try {
      const response = await axios.get('/users?role=MENTEE&status=ACTIVE');
      // Add mock progress data for demo
      const menteesWithProgress = response.data.data.map((mentee: any) => ({
        ...mentee,
        joinedAt: mentee.createdAt,
        progress: Math.floor(Math.random() * 100),
        totalSessions: Math.floor(Math.random() * 20) + 1,
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }));
      setMentees(menteesWithProgress);
    } catch (error) {
      console.error('Error fetching mentees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (mentee: Mentee) => {
    // Navigate to chat with mentee
    window.location.href = `/chat?mentee=${mentee.id}`;
  };

  const handleStartVideoCall = (mentee: Mentee) => {
    // Navigate to video call with mentee
    window.location.href = `/video-call?mentee=${mentee.id}`;
  };

  const handleViewProgress = (mentee: Mentee) => {
    // Navigate to mentee's progress page
    window.location.href = `/mentee-progress/${mentee.id}`;
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
        <h1 className="text-3xl font-bold text-gray-900">My Mentees</h1>
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
              {mentee.avatar ? (
                <img
                  src={mentee.avatar}
                  alt={mentee.name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {mentee.name.charAt(0)}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{mentee.name}</h3>
                <p className="text-sm text-gray-600">{mentee.email}</p>
                <p className="text-xs text-gray-500">
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
                    Math.floor((Date.now() - new Date(mentee.lastActive).getTime()) / (1000 * 60 * 60 * 24))
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
                onClick={() => handleViewProgress(mentee)}
                className="flex items-center justify-center bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
    </div>
  );
};

export default MenteesPage;