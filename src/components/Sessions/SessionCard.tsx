import React, { useState } from 'react';
import { Calendar, Clock, Users, Edit, Trash2, Play, CheckCircle, Eye, MoreVertical } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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

interface SessionCardProps {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (sessionId: string) => void;
  onStatusChange: (sessionId: string, status: string) => void;
  onView?: (session: Session) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onEdit,
  onDelete,
  onStatusChange,
  onView
}) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Play className="h-3 w-3" />;
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDate(session.date);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MENTOR';
  const canView = !canEdit; // Mentees can view details

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {session.title}
            </h3>
            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
              {getStatusIcon(session.status)}
              <span>{session.status.replace('_', ' ')}</span>
            </span>
          </div>
          
          {session.description && (
            <p className="text-gray-600 mb-3 text-sm">{session.description}</p>
          )}
        </div>
        
        <div className="relative ml-4">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                {canView && onView && (
                  <button
                    onClick={() => {
                      onView(session);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                )}
                
                {canEdit && (
                  <>
                    <button
                      onClick={() => {
                        onEdit(session);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Session</span>
                    </button>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={() => {
                        onDelete(session.id);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Session</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close actions menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowActions(false)}
        />
      )}
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <div>
              <span className="font-medium">{date}</span>
              <span className="block text-xs">{time}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{session.duration} minutes</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{session.mentees.length} mentee{session.mentees.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Mentor:</span> {session.mentor.name}
              </p>
              {session.mentees.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Mentees:</span>{' '}
                  {session.mentees.slice(0, 3).map(m => m.mentee.name).join(', ')}
                  {session.mentees.length > 3 && ` +${session.mentees.length - 3} more`}
                </p>
              )}
            </div>
            
            {canEdit && (
              <div className="flex space-x-2 ml-4">
                {session.status === 'SCHEDULED' && (
                  <button
                    onClick={() => onStatusChange(session.id, 'IN_PROGRESS')}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                  >
                    <Play className="h-3 w-3" />
                    <span>Start</span>
                  </button>
                )}
                
                {session.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => onStatusChange(session.id, 'COMPLETED')}
                    className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Complete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCard;