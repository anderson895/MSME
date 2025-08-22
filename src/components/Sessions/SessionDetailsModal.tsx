import { Calendar, Clock, FileText, Tag, User, Users, X } from 'lucide-react';
import React from 'react';

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
  mentees: Array<{
    mentee: {
      id: string;
      name: string;
    };
  }>;
}

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  session
}) => {
  if (!isOpen || !session) return null;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return '🟡';
      case 'COMPLETED':
        return '✅';
      case 'CANCELLED':
        return '❌';
      default:
        return '📅';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDate(session.date);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getStatusIcon(session.status)}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>
              <p className="text-sm text-gray-500">ID: {session.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title and Status */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{session.title}</h1>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
              {session.status.replace('_', ' ')}
            </span>
          </div>

          {/* Description */}
          {session.description && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Description</h3>
                  <p className="text-sm text-gray-700">{session.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Session Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Date & Time</h3>
                  <p className="text-sm text-blue-800 font-medium">{date}</p>
                  <p className="text-sm text-blue-700">{time}</p>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-green-900 mb-1">Duration</h3>
                  <p className="text-sm text-green-800 font-medium">{session.duration} minutes</p>
                  <p className="text-sm text-green-700">
                    {Math.floor(session.duration / 60)}h {session.duration % 60}m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mentor Info */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-purple-900 mb-1">Session Mentor</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-purple-800 text-sm font-medium">
                      {session.mentor.name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm text-purple-800 font-medium">{session.mentor.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-900 mb-3">
                  Participants ({session.mentees.length})
                </h3>
                
                {session.mentees.length === 0 ? (
                  <p className="text-sm text-orange-700">No participants assigned</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {session.mentees.map((menteeData) => (
                      <div key={menteeData.mentee.id} className="flex items-center space-x-2 bg-white rounded-lg p-2">
                        <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-800 text-xs font-medium">
                            {menteeData.mentee.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-orange-800 font-medium truncate">
                          {menteeData.mentee.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Timeline */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Session Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Start Time:</span>
                <span className="font-medium">{time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Time:</span>
                <span className="font-medium">
                  {new Date(new Date(session.date).getTime() + session.duration * 60000)
                    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{session.duration} minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
            
            {session.status === 'SCHEDULED' && (
              <button
                onClick={() => {
                  // Add to calendar functionality could go here
                  onClose();
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Add to Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailsModal;