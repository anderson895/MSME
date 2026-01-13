import React from 'react';
import { Phone, PhoneOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

const CallNotification: React.FC = () => {
  const { incomingCall, clearIncomingCall, socket } = useSocket();
  const navigate = useNavigate();

  if (!incomingCall) return null;

  const handleAccept = () => {
    // Store the call offer in sessionStorage so VideoCallPage can access it
    if (incomingCall.offer) {
      sessionStorage.setItem('pendingCallOffer', JSON.stringify({
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        offer: incomingCall.offer
      }));
    }
    // Navigate to video call page with caller ID
    const callerId = incomingCall.callerId;
    navigate(`/app/video-call?caller=${callerId}`);
    clearIncomingCall();
  };

  const handleReject = () => {
    // Send rejection signal
    if (socket) {
      socket.emit('reject_call', { callerId: incomingCall.callerId });
    }
    clearIncomingCall();
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-6 min-w-[320px] animate-slide-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Incoming Call</h3>
            <p className="text-sm text-gray-600">{incomingCall.callerName}</p>
          </div>
        </div>
        <button
          onClick={handleReject}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Phone className="h-5 w-5" />
          <span>Accept</span>
        </button>
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="h-5 w-5" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
};

export default CallNotification;

