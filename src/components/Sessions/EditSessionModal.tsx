/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, AlertCircle, Save } from 'lucide-react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Session {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  meetingUrl?: string;
  mentees: Array<{
    mentee: {
      id: string;
      name: string;
    };
  }>;
}

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
  session: Session | null;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionUpdated,
  session
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    duration: 60,
    status: 'SCHEDULED' as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    meetingUrl: '',
    menteeIds: [] as string[]
  });
  const [allMentees, setAllMentees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [menteesLoading, setMenteesLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenteeSelection, setShowMenteeSelection] = useState(false);

  useEffect(() => {
    if (session && isOpen) {
      // Convert UTC date from database to local time for datetime-local input
      // datetime-local expects format "YYYY-MM-DDTHH:mm" in local timezone
      const sessionDate = new Date(session.date);
      // Get local date components
      const year = sessionDate.getFullYear();
      const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const day = String(sessionDate.getDate()).padStart(2, '0');
      const hours = String(sessionDate.getHours()).padStart(2, '0');
      const minutes = String(sessionDate.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      setFormData({
        title: session.title,
        description: session.description || '',
        date: formattedDate,
        duration: session.duration,
        status: session.status,
        meetingUrl: session.meetingUrl || '',
        menteeIds: session.mentees.map(m => m.mentee.id)
      });
      setError('');
      setSearchTerm('');
      
      if (showMenteeSelection) {
        fetchAllMentees();
      }
    }
  }, [session, isOpen, showMenteeSelection]);

  const fetchAllMentees = async () => {
    try {
      setMenteesLoading(true);
      const response = await axios.get('/users?role=MENTEE&status=ACTIVE');
      setAllMentees(response.data.data);
    } catch (error) {
      console.error('Error fetching mentees:', error);
      setAllMentees([]);
    } finally {
      setMenteesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Validation
    if (!formData.title.trim()) {
      setError('Session title is required');
      return;
    }
    
    if (!formData.date) {
      setError('Date and time are required');
      return;
    }

    // Check if date is in the future for scheduled sessions
    if (formData.status === 'SCHEDULED') {
      const sessionDate = new Date(formData.date);
      const now = new Date();
      if (sessionDate <= now) {
        setError('Scheduled session date must be in the future');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Convert datetime-local to ISO string to preserve the exact moment in time
      const dateToSend = formData.date ? new Date(formData.date).toISOString() : formData.date;
      
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        date: dateToSend,
        duration: formData.duration,
        status: formData.status
      };

      // Include meetingUrl if provided (for group sessions with external links like Google Meet)
      if (formData.meetingUrl.trim()) {
        updateData.meetingUrl = formData.meetingUrl.trim();
      }

      // Include menteeIds if mentee selection was modified
      if (showMenteeSelection) {
        updateData.menteeIds = formData.menteeIds;
      }

      const response = await axios.put(`/sessions/${session.id}`, updateData);
      console.log('Session updated successfully:', response.data);
      onSessionUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating session:', error);
      let errorMessage = 'Failed to update session';
      
      if (error.response) {
        // Handle different HTTP status codes
        if (error.response.status === 404) {
          errorMessage = 'Session not found. It may have been deleted.';
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.message || 'You do not have permission to update this session';
        } else if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please refresh the page and try again.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMenteeToggle = (menteeId: string) => {
    setFormData(prev => ({
      ...prev,
      menteeIds: prev.menteeIds.includes(menteeId)
        ? prev.menteeIds.filter(id => id !== menteeId)
        : [...prev.menteeIds, menteeId]
    }));
  };

  const getFilteredMentees = () => {
    return allMentees.filter(mentee =>
      mentee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentee.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEditDateTime = () => {
    return formData.status === 'SCHEDULED';
  };

  if (!isOpen || !session) return null;

  const filteredMentees = getFilteredMentees();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Training Session</h2>
            <p className="text-sm text-gray-500 mt-1">Session ID: {session.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Sales Strategy Workshop"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Describe what will be covered in this session..."
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getStatusColor(formData.status)}`}
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!canEditDateTime()}
                    required
                  />
                  {!canEditDateTime() && (
                    <p className="text-xs text-gray-500 mt-1">
                      Date/time can only be edited for scheduled sessions
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Duration (minutes) *
                  </label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
              </div>

              {/* Meeting URL - Show for group sessions or when status is IN_PROGRESS */}
              {(session.mentees.length > 1 || formData.status === 'IN_PROGRESS') && (
                <div>
                  <label htmlFor="meetingUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting URL
                  </label>
                  <input
                    type="url"
                    id="meetingUrl"
                    value={formData.meetingUrl}
                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx or other meeting link"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {session.mentees.length > 1 
                      ? 'For group sessions, provide an external meeting URL (e.g., Google Meet, Zoom)'
                      : 'Provide an external meeting URL for the session'}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Current Mentees */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1" />
                    Assigned Mentees ({session.mentees.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenteeSelection(!showMenteeSelection);
                      if (!showMenteeSelection) {
                        fetchAllMentees();
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showMenteeSelection ? 'Hide Selection' : 'Modify Selection'}
                  </button>
                </div>

                {/* Current Mentees Display */}
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  {session.mentees.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No mentees assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {session.mentees.map((menteeData) => (
                        <div key={menteeData.mentee.id} className="flex items-center space-x-3 bg-white p-2 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-sm font-medium">
                              {menteeData.mentee.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 flex-1">
                            {menteeData.mentee.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mentee Selection Panel */}
                {showMenteeSelection && (
                  <div className="mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Modify Mentee Selection</h4>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Search mentees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      
                      <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white">
                        {menteesLoading ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading mentees...</p>
                          </div>
                        ) : filteredMentees.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-gray-500 text-sm">
                              {searchTerm ? 'No mentees found matching your search' : 'No mentees available'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 space-y-2">
                            {filteredMentees.map((mentee) => (
                              <label key={mentee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={formData.menteeIds.includes(mentee.id)}
                                  onChange={() => handleMenteeToggle(mentee.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 text-sm font-medium">
                                    {mentee.name.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{mentee.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{mentee.email}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-blue-600 font-medium">
                        Note: Mentee selection changes are not saved automatically. Click "Update Session" to apply changes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Session Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p><strong>Title:</strong> {formData.title || 'Untitled Session'}</p>
                <p><strong>Status:</strong> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
                  {formData.status.replace('_', ' ')}
                </span></p>
              </div>
              <div>
                <p><strong>Date:</strong> {formData.date ? new Date(formData.date).toLocaleString() : 'Not set'}</p>
                <p><strong>Duration:</strong> {formData.duration} minutes</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Save className="h-4 w-4 mr-2" />
                  Update Session
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSessionModal;