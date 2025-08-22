/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { MessageCircle, Search, Star, Users, Video } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Mentor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  specialization?: string;
  experience?: string;
  rating: number;
  totalRatings: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const MentorsPage: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const response = await axios.get('/users?role=MENTOR&status=ACTIVE');
      // Add mock rating data for demo
      const mentorsWithRatings = response.data.data.map((mentor: any) => ({
        ...mentor,
        rating: 4.2 + Math.random() * 0.8,
        totalRatings: Math.floor(Math.random() * 50) + 10,
        specialization: 'Sales & Marketing',
        experience: '5+ years'
      }));
      setMentors(mentorsWithRatings);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (mentor: Mentor) => {
    // Navigate to chat with mentor
    window.location.href = `/chat?mentor=${mentor.id}`;
  };

  const handleStartVideoCall = (mentor: Mentor) => {
    // Navigate to video call with mentor
    window.location.href = `/video-call?mentor=${mentor.id}`;
  };

  const handleRateMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!selectedMentor) return;

    try {
      await axios.post('/ratings', {
        mentorId: selectedMentor.id,
        score: rating,
        comment
      });
      
      setShowRatingModal(false);
      setSelectedMentor(null);
      setRating(5);
      setComment('');
      
      // Refresh mentors to update ratings
      fetchMentors();
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900">Available Mentors</h1>
        <p className="text-gray-600 mt-2">Connect with experienced mentors to accelerate your growth</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search mentors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMentors.map((mentor) => (
          <div key={mentor.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4 mb-4">
              {mentor.avatar ? (
                <img
                  src={mentor.avatar}
                  alt={mentor.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xl font-medium">
                    {mentor.name.charAt(0)}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{mentor.name}</h3>
                <p className="text-sm text-gray-600">{mentor.specialization}</p>
                <p className="text-xs text-gray-500">{mentor.experience}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(mentor.rating) ? 'fill-current' : ''
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {mentor.rating.toFixed(1)} ({mentor.totalRatings} reviews)
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleStartChat(mentor)}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </button>
              
              <button
                onClick={() => handleStartVideoCall(mentor)}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Video className="h-4 w-4" />
                <span>Video Call</span>
              </button>
              
              <button
                onClick={() => handleRateMentor(mentor)}
                className="flex items-center justify-center bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Star className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No mentors found matching your search</p>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Rate {selectedMentor.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Share your experience..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorsPage;