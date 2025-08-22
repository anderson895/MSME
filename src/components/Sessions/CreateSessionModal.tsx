/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { Calendar, Clock, Users, X, AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    duration: 60,
    menteeIds: [] as string[]
  });
  const [mentees, setMentees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [menteesLoading, setMenteesLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMentees();
      // Reset form when modal opens
      setFormData({
        title: '',
        description: '',
        date: '',
        duration: 60,
        menteeIds: []
      });
      setError('');
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchMentees = async () => {
    try {
      setMenteesLoading(true);
      const response = await axios.get('/users?role=MENTEE&status=ACTIVE');
      setMentees(response.data.data);
    } catch (error) {
      console.error('Error fetching mentees:', error);
      setMentees([]);
      setError('Failed to load mentees. Please try again.');
    } finally {
      setMenteesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Session title is required');
      return;
    }
    
    if (!formData.date) {
      setError('Date and time are required');
      return;
    }
    
    if (formData.menteeIds.length === 0) {
      setError('Please select at least one mentee');
      return;
    }

    // Check if date is in the future
    const sessionDate = new Date(formData.date);
    const now = new Date();
    if (sessionDate <= now) {
      setError('Session date must be in the future');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/sessions', formData);
      onSessionCreated();
      onClose();
      setFormData({
        title: '',
        description: '',
        date: '',
        duration: 60,
        menteeIds: []
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create session');
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

  const selectAllMentees = () => {
    const filteredMentees = getFilteredMentees();
    setFormData(prev => ({
      ...prev,
      menteeIds: filteredMentees.map(m => m.id)
    }));
  };

  const deselectAllMentees = () => {
    setFormData(prev => ({
      ...prev,
      menteeIds: []
    }));
  };

  const getFilteredMentees = () => {
    return mentees.filter(mentee =>
      mentee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentee.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  if (!isOpen) return null;

  const filteredMentees = getFilteredMentees();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Training Session</h2>
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
                    min={getMinDateTime()}
                    required
                  />
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
            </div>

            {/* Right Column - Mentee Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  Select Mentees *
                </label>
                
                {/* Search and Actions */}
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search mentees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllMentees}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      Select All ({filteredMentees.length})
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllMentees}
                      className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {/* Mentees List */}
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
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
                
                {formData.menteeIds.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {formData.menteeIds.length} mentee(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Session Preview */}
          {formData.title && formData.date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Session Preview</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Date:</strong> {new Date(formData.date).toLocaleString()}</p>
                <p><strong>Duration:</strong> {formData.duration} minutes</p>
                <p><strong>Participants:</strong> {formData.menteeIds.length} mentee(s)</p>
              </div>
            </div>
          )}

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
              disabled={loading || formData.menteeIds.length === 0 || menteesLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </span>
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSessionModal;