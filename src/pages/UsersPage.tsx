/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { Search, UserCheck, Users, FileText, Eye, X, MessageCircle, Video, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'MENTEE';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
  verified: boolean;
  businessPermitUrl?: string;
  businessPermitFileName?: string;
  businessPermitFileSize?: number;
  experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  attendedSessions?: number;
  createdAt: string;
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('');
  const [viewingPermit, setViewingPermit] = useState<{ userId: string; url: string; contentType: string } | null>(null);
  const [viewingRevenue, setViewingRevenue] = useState<{ userId: string; userName: string } | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ month: number; year: number; revenue: number }>>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [showPromotionConfirm, setShowPromotionConfirm] = useState<{ userId: string; userName: string; currentLevel?: string; nextLevel: string; action: 'promote' | 'downgrade' } | null>(null);

  // Read status from URL query parameter on mount
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL') => {
    try {
      await axios.put(`/users/${userId}/status`, { status });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  const handlePromoteClick = (userId: string, currentLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    let nextLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    
    if (!currentLevel || currentLevel === 'BEGINNER') {
      nextLevel = 'INTERMEDIATE';
    } else if (currentLevel === 'INTERMEDIATE') {
      nextLevel = 'ADVANCED';
    } else {
      alert('User is already at the highest level (Advanced)');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      setShowPromotionConfirm({
        userId,
        userName: user.name,
        currentLevel,
        nextLevel,
        action: 'promote'
      });
    }
  };

  const handleDowngradeClick = (userId: string, currentLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    let nextLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    
    if (!currentLevel || currentLevel === 'ADVANCED') {
      nextLevel = 'INTERMEDIATE';
    } else if (currentLevel === 'INTERMEDIATE') {
      nextLevel = 'BEGINNER';
    } else {
      alert('User is already at the lowest level (Beginner)');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      setShowPromotionConfirm({
        userId,
        userName: user.name,
        currentLevel,
        nextLevel,
        action: 'downgrade'
      });
    }
  };

  const updateExperienceLevel = async () => {
    if (!showPromotionConfirm) return;

    try {
      const { userId, nextLevel, action } = showPromotionConfirm;
      
      await axios.put(`/users/${userId}/experience-level`, { experienceLevel: nextLevel });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, experienceLevel: nextLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' } : user
      ));
      const actionText = action === 'promote' ? 'promoted' : 'downgraded';
      alert(`Successfully ${actionText} ${showPromotionConfirm.userName} to ${getExperienceLevelLabel(nextLevel)}`);
      setShowPromotionConfirm(null);
    } catch (error: any) {
      console.error(`Error ${showPromotionConfirm.action}ing experience level:`, error);
      const actionText = showPromotionConfirm.action === 'promote' ? 'promote' : 'downgrade';
      alert(error.response?.data?.message || `Failed to ${actionText} experience level. Please try again.`);
    }
  };

  const getExperienceLevelColor = (level?: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-yellow-100 text-yellow-800';
      case 'INTERMEDIATE':
        return 'bg-blue-100 text-blue-800';
      case 'ADVANCED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExperienceLevelLabel = (level?: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Beginner';
      case 'INTERMEDIATE':
        return 'Intermediate';
      case 'ADVANCED':
        return 'Advanced';
      default:
        return 'Not Set';
    }
  };

  const handleViewBusinessPermit = async (userId: string) => {
    try {
      // Get the token for authentication
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Please log in to view business permits');
        return;
      }

      // Fetch the file as blob
      const response = await axios.get(`/users/${userId}/business-permit`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Get content type from response headers
      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'application/octet-stream';
      
      // Create blob with proper MIME type
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Store the blob URL and content type for display in modal
      setViewingPermit({ userId, url: blobUrl, contentType });
    } catch (error: any) {
      console.error('Error viewing business permit:', error);
      if (error.response?.status === 404) {
        alert('Business permit file not found for this user');
      } else {
        alert(error.response?.data?.message || 'Failed to view business permit');
      }
    }
  };

  const handleStartChat = (userId: string) => {
    navigate(`/chat?mentee=${userId}`);
  };

  const handleStartVideoCall = (userId: string) => {
    navigate(`/video-call?mentee=${userId}`);
  };

  const handleViewProgress = async (userId: string, userName: string) => {
    setViewingRevenue({ userId, userName });
    setLoadingRevenue(true);
    try {
      const response = await axios.get(`/analytics/sales/${userId}`);
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.status === selectedStatus;
    const matchesExperienceLevel = !selectedExperienceLevel || 
      (selectedExperienceLevel === 'NOT_SET' && !user.experienceLevel) ||
      (selectedExperienceLevel !== 'NOT_SET' && user.experienceLevel === selectedExperienceLevel);
    return matchesSearch && matchesRole && matchesStatus && matchesExperienceLevel;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MENTOR':
        return 'bg-blue-100 text-blue-800';
      case 'MENTEE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage users and their access levels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-500 p-3 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'PENDING_APPROVAL').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mentors</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'MENTOR').length}
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
              <p className="text-sm font-medium text-gray-600">Mentees</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'MENTEE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MENTOR">Mentor</option>
          <option value="MENTEE">Mentee</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => {
            const newStatus = e.target.value;
            setSelectedStatus(newStatus);
            // Update URL query parameter
            if (newStatus) {
              setSearchParams({ status: newStatus });
            } else {
              setSearchParams({});
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
        </select>

        <select
          value={selectedExperienceLevel}
          onChange={(e) => setSelectedExperienceLevel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Experience Levels</option>
          <option value="NOT_SET">Not Set</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Permit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attended Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.role === 'MENTEE' && user.businessPermitUrl ? (
                      <button
                        onClick={() => handleViewBusinessPermit(user.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title={`View ${user.businessPermitFileName || 'business permit'}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Permit
                      </button>
                    ) : user.role === 'MENTEE' ? (
                      <span className="text-xs text-gray-400">No permit</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.role === 'MENTEE' ? (
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExperienceLevelColor(user.experienceLevel)}`}>
                          {getExperienceLevelLabel(user.experienceLevel)}
                        </span>
                        <div className="flex items-center space-x-1">
                          {user.experienceLevel !== 'ADVANCED' && (
                            <button
                              onClick={() => handlePromoteClick(user.id, user.experienceLevel)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title={`Promote to ${user.experienceLevel === 'BEGINNER' || !user.experienceLevel ? 'Intermediate' : 'Advanced'}`}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          {user.experienceLevel && user.experienceLevel !== 'BEGINNER' && (
                            <button
                              onClick={() => handleDowngradeClick(user.id, user.experienceLevel)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title={`Downgrade to ${user.experienceLevel === 'ADVANCED' ? 'Intermediate' : 'Beginner'}`}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'MENTEE' ? (
                      <span>{user.attendedSessions ?? 0} sessions</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {/* Status Actions */}
                      {user.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                      ) : user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => updateUserStatus(user.id, 'INACTIVE')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                      
                      {/* Action Buttons for Mentees */}
                      {user.role === 'MENTEE' && (
                        <>
                          <button
                            onClick={() => handleStartChat(user.id)}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Chat"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStartVideoCall(user.id)}
                            className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Video Call"
                          >
                            <Video className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewProgress(user.id, user.name)}
                            className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            title="View Revenue Trend"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No users found matching your criteria</p>
        </div>
      )}

      {/* Business Permit Viewer Modal */}
      {viewingPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Business Permit</h3>
              <button
                onClick={() => {
                  if (viewingPermit.url.startsWith('blob:')) {
                    window.URL.revokeObjectURL(viewingPermit.url);
                  }
                  setViewingPermit(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingPermit.url && (
                <>
                  {viewingPermit.contentType.startsWith('image/') ? (
                    <div className="flex items-center justify-center h-full min-h-[500px]">
                      <img
                        src={viewingPermit.url}
                        alt="Business Permit"
                        className="max-w-full max-h-full object-contain border border-gray-200 rounded-lg"
                        onError={() => {
                          alert('Failed to load business permit image. The file may be corrupted.');
                        }}
                      />
                    </div>
                  ) : viewingPermit.contentType === 'application/pdf' ? (
                    <iframe
                      src={viewingPermit.url}
                      className="w-full h-full min-h-[500px] border border-gray-200 rounded-lg"
                      title="Business Permit"
                      onError={() => {
                        alert('Failed to load business permit PDF. The file may be corrupted.');
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-500">
                      <FileText className="h-16 w-16 mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Business Permit File</p>
                      <p className="text-sm mb-4">File type: {viewingPermit.contentType}</p>
                      <a
                        href={viewingPermit.url}
                        download={`business-permit-${viewingPermit.userId}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  if (viewingPermit.url.startsWith('blob:')) {
                    window.URL.revokeObjectURL(viewingPermit.url);
                  }
                  setViewingPermit(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experience Level Update Confirmation Modal */}
      {showPromotionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${showPromotionConfirm.action === 'promote' ? 'bg-yellow-100' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`h-5 w-5 ${showPromotionConfirm.action === 'promote' ? 'text-yellow-600' : 'text-orange-600'}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {showPromotionConfirm.action === 'promote' ? 'Confirm Promotion' : 'Confirm Downgrade'}
                </h3>
              </div>
              <button
                onClick={() => setShowPromotionConfirm(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to {showPromotionConfirm.action === 'promote' ? 'promote' : 'downgrade'}{' '}
                <span className="font-semibold">{showPromotionConfirm.userName}</span> from{' '}
                <span className="font-semibold">{getExperienceLevelLabel(showPromotionConfirm.currentLevel || 'BEGINNER')}</span> to{' '}
                <span className="font-semibold">{getExperienceLevelLabel(showPromotionConfirm.nextLevel)}</span>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {showPromotionConfirm.action === 'promote' 
                  ? "This action will update the mentee's experience level. Make sure they have attended the required number of sessions."
                  : "This action will downgrade the mentee's experience level. This can be reversed if needed."}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPromotionConfirm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateExperienceLevel}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    showPromotionConfirm.action === 'promote'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {showPromotionConfirm.action === 'promote' ? (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      <span>Confirm Promotion</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      <span>Confirm Downgrade</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trend Modal */}
      {viewingRevenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
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
                              {improvement.difference > 0 ? '+' : ''}${Math.abs(improvement.difference).toLocaleString()} 
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

export default UsersPage;