/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { Send, Phone, Video, MoreVertical, Search, User, Trash2, Archive, Users, Plus, X, LogOut, UserMinus, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../hooks/useAuth";
import { getAvatarUrl } from "../utils/avatarUtils";
import axios from "axios";

interface ChatUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isGroup?: boolean;
  online?: boolean;
  createdBy?: string;
  isGeneral?: boolean;
  email?: string;
  status?: string;
  verified?: boolean;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  joinedAt: string;
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  isGeneral?: boolean;
  creator?: {
    id: string;
    name: string;
    role: string;
  };
  members: GroupMember[];
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { sendMessage, socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', memberIds: [] as string[] });
  const [availableMembers, setAvailableMembers] = useState<ChatUser[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState<GroupMember | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchChatUsers();
  }, []);

  // Handle URL query parameter for mentee/mentor selection
  useEffect(() => {
    const menteeId = searchParams.get('mentee');
    const mentorId = searchParams.get('mentor');
    const targetId = menteeId || mentorId;
    
    if (targetId) {
      if (chatUsers.length > 0) {
        // Chat users are loaded, find and select the user
        const targetUser = chatUsers.find(u => u.id === targetId && !u.isGroup);
        if (targetUser) {
          setSelectedChat(targetUser);
          // Clear the query parameter after selecting
          setSearchParams({});
        } else {
          // User not found in chat list - wait a bit and retry, or keep the param
          // Don't clear immediately, wait for potential retry
          const retryTimeout = setTimeout(() => {
            // If still not found after retry, clear the param
            const stillNotFound = !chatUsers.find(u => u.id === targetId);
            if (stillNotFound) {
              setSearchParams({});
            }
          }, 2000);
          return () => clearTimeout(retryTimeout);
        }
      }
      // If chatUsers not loaded yet, wait for them to load
      // Don't clear the param until we've checked
    }
  }, [chatUsers, searchParams, setSearchParams, loading]);

  // Listen for notification click events to select a user
  useEffect(() => {
    const handleSelectChatUser = (event: CustomEvent) => {
      const { id, name } = event.detail;
      
      if (chatUsers.length > 0) {
        let user: ChatUser | undefined;
        if (id) {
          user = chatUsers.find(u => u.id === id);
        } else if (name) {
          user = chatUsers.find(u => u.name === name);
        }
        if (user) {
          setSelectedChat(user);
        }
      } else {
        const checkInterval = setInterval(() => {
          if (chatUsers.length > 0) {
            clearInterval(checkInterval);
            let user: ChatUser | undefined;
            if (id) {
              user = chatUsers.find(u => u.id === id);
            } else if (name) {
              user = chatUsers.find(u => u.name === name);
            }
            if (user) {
              setSelectedChat(user);
            }
          }
        }, 100);
        
        // Clear interval after 5 seconds to avoid infinite waiting
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    };

    window.addEventListener('selectChatUser', handleSelectChatUser as EventListener);
    return () => {
      window.removeEventListener('selectChatUser', handleSelectChatUser as EventListener);
    };
  }, [chatUsers]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      
      // Join group room if it's a group chat
      if (selectedChat.isGroup && socket) {
        socket.emit('join_room', selectedChat.id);
      }

      // Fetch group info if it's a group chat
      if (selectedChat.isGroup) {
        fetchGroupInfo(selectedChat.id);
      } else {
        setGroupInfo(null);
      }
    }
  }, [selectedChat, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message: Message) => {
        // Only add message if it's for the current chat
        if (selectedChat) {
          const isForCurrentChat = selectedChat.isGroup 
            ? message.groupId === selectedChat.id
            : (message.senderId === selectedChat.id && message.receiverId === user?.id) ||
              (message.senderId === user?.id && message.receiverId === selectedChat.id);
          
          if (isForCurrentChat) {
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(m => m.id === message.id);
              if (exists) return prev;
              return [...prev, message];
            });
          }
        }
      };

      const handleMessageSent = (message: Message) => {
        // Handle message sent confirmation - add to messages if for current chat
        if (selectedChat) {
          const isForCurrentChat = selectedChat.isGroup 
            ? message.groupId === selectedChat.id
            : (message.senderId === user?.id && message.receiverId === selectedChat.id);
          
          if (isForCurrentChat) {
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(m => m.id === message.id);
              if (exists) return prev;
              return [...prev, message];
            });
          }
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);
      
      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleMessageSent);
      };
    }
  }, [socket, selectedChat, user?.id]);
  const fetchChatUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/messages/users");
      const users = response.data.data || [];
      
      // Get archived chats from localStorage
      const archivedChats = JSON.parse(localStorage.getItem('archivedChats') || '[]');
      
      // Filter out archived chats
      const filteredUsers = users.filter((chatUser: ChatUser) => !archivedChats.includes(chatUser.id));
      
      // Update online status based on onlineUsers from socket
      const usersWithOnlineStatus = filteredUsers.map((chatUser: ChatUser) => ({
        ...chatUser,
        online: onlineUsers.includes(chatUser.id)
      }));
      setChatUsers(usersWithOnlineStatus);
      
      // After loading chat users, check if there's a mentee/mentor in URL to select
      const menteeId = searchParams.get('mentee');
      const mentorId = searchParams.get('mentor');
      const targetId = menteeId || mentorId;
      if (targetId) {
        const targetUser = usersWithOnlineStatus.find((u: ChatUser) => u.id === targetId && !u.isGroup);
        if (targetUser) {
          setSelectedChat(targetUser);
          setSearchParams({});
        }
      }
      
      // Fetch available members for group creation (mentors/admins only)
      if (user?.role === 'MENTOR' || user?.role === 'ADMIN') {
        const membersResponse = await axios.get("/users?status=ACTIVE");
        const allUsers = membersResponse.data.data || [];
        // Filter out current user and only include mentees for mentors
        const filtered = allUsers.filter((u: ChatUser) => {
          if (u.id === user?.id) return false;
          if (user?.role === 'MENTOR') {
            return u.role === 'MENTEE' || u.role === 'ADMIN';
          }
          return true; // Admin can add anyone
        });
        setAvailableMembers(filtered);
      }
    } catch (error) {
      console.error("Error fetching chat users:", error);
      setChatUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Update chat users' online status when onlineUsers changes
  useEffect(() => {
    setChatUsers(prev => prev.map(chatUser => {
      const isOnline = onlineUsers.includes(chatUser.id);
      // Also check if user sent a message recently (within last 2 minutes) - consider them online
      const recentMessage = messages.find(m => 
        m.senderId === chatUser.id && 
        new Date(m.createdAt).getTime() > Date.now() - 2 * 60 * 1000
      );
      return {
        ...chatUser,
        online: isOnline || !!recentMessage
      };
    }));
    
    // Also update selectedChat's online status if it exists
    if (selectedChat) {
      const isOnline = onlineUsers.includes(selectedChat.id);
      // Check if they sent a message recently
      const recentMessage = messages.find(m => 
        m.senderId === selectedChat.id && 
        new Date(m.createdAt).getTime() > Date.now() - 2 * 60 * 1000
      );
      const shouldBeOnline = isOnline || !!recentMessage;
      
      if (selectedChat.online !== shouldBeOnline) {
        setSelectedChat(prev => prev ? {
          ...prev,
          online: shouldBeOnline
        } : null);
      }
    }
  }, [onlineUsers, messages]);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
    };

    if (showMenu || showGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showGroupMenu]);

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      setMessagesLoading(true);
      let response;

      if (selectedChat.isGroup) {
        response = await axios.get(`/messages/group/${selectedChat.id}`);
      } else {
        response = await axios.get(`/messages/direct/${selectedChat.id}`);
      }

      setMessages(response.data.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const messageData = {
      content: newMessage,
      ...(selectedChat.isGroup
        ? { groupId: selectedChat.id }
        : { receiverId: selectedChat.id }),
    };

    // Send via socket
    sendMessage(messageData);

    setNewMessage("");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handlePhoneCall = () => {
    if (!selectedChat) return;
    
    // Check if there's an active call
    const isCallActive = sessionStorage.getItem('isCallActive') === 'true';
    if (isCallActive) {
      const confirmed = window.confirm('You have an active call. Ending the call will disconnect you. Do you want to end the call and start a new one?');
      if (confirmed) {
        sessionStorage.setItem('isCallActive', 'false');
        sessionStorage.setItem('allowNavigation', 'true');
      } else {
        return;
      }
    }
    
    // Navigate to video call page (audio-only can be handled there)
    const paramName = selectedChat.role === 'MENTEE' ? 'mentee' : 'mentor';
    navigate(`/video-call?${paramName}=${selectedChat.id}`);
  };

  const handleVideoCall = () => {
    if (!selectedChat) return;
    
    // Check if there's an active call
    const isCallActive = sessionStorage.getItem('isCallActive') === 'true';
    if (isCallActive) {
      const confirmed = window.confirm('You have an active call. Ending the call will disconnect you. Do you want to end the call and start a new one?');
      if (confirmed) {
        sessionStorage.setItem('isCallActive', 'false');
        sessionStorage.setItem('allowNavigation', 'true');
      } else {
        return;
      }
    }
    
    const paramName = selectedChat.role === 'MENTEE' ? 'mentee' : 'mentor';
    navigate(`/video-call?${paramName}=${selectedChat.id}`);
  };

  const handleViewProfile = async () => {
    if (!selectedChat || selectedChat.isGroup) return;
    
    try {
      setLoadingProfile(true);
      setShowMenu(false);
      
      // Fetch user details
      const response = await axios.get(`/users/${selectedChat.id}`);
      setProfileUser(response.data.data);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      alert('Failed to load user profile. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    if (window.confirm(`Are you sure you want to clear chat with ${selectedChat.name}?`)) {
      try {
        const requestData = selectedChat.isGroup
          ? { groupId: selectedChat.id }
          : { userId: selectedChat.id };

        await axios.delete('/messages/delete', { data: requestData });
        
        // Clear messages from local state
        setMessages([]);
        setShowMenu(false);
      } catch (error) {
        console.error('Error deleting messages:', error);
        alert('Failed to delete messages. Please try again.');
      }
    }
  };

  const handleArchiveChat = () => {
    if (!selectedChat) return;
    
    try {
      // Get archived chats from localStorage
      const archivedChats = JSON.parse(localStorage.getItem('archivedChats') || '[]');
      
      // Check if already archived
      if (archivedChats.includes(selectedChat.id)) {
        alert(`Chat with ${selectedChat.name} is already archived`);
        setShowMenu(false);
        return;
      }
      
      // Add to archived list
      archivedChats.push(selectedChat.id);
      localStorage.setItem('archivedChats', JSON.stringify(archivedChats));
      
      // Remove from chat list
      setChatUsers(prev => prev.filter(chat => chat.id !== selectedChat.id));
      setSelectedChat(null);
      setShowMenu(false);
      
      // Show success message
      alert(`Chat with ${selectedChat.name} has been archived`);
    } catch (error) {
      console.error('Error archiving chat:', error);
      alert('Failed to archive chat. Please try again.');
    }
  };

  const fetchGroupInfo = async (groupId: string) => {
    try {
      const response = await axios.get(`/messages/groups/${groupId}/members`);
      setGroupInfo(response.data.data);
    } catch (error) {
      console.error('Error fetching group info:', error);
      setGroupInfo(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat || !selectedChat.isGroup) return;
    if (window.confirm(`Are you sure you want to leave "${selectedChat.name}"?`)) {
      try {
        await axios.post(`/messages/groups/${selectedChat.id}/leave`);
        setShowGroupMenu(false);
        setSelectedChat(null);
        setGroupInfo(null);
        fetchChatUsers(); // Refresh chat list
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group. Please try again.');
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedChat || !selectedChat.isGroup || !groupInfo) return;
    if (window.confirm(`Are you sure you want to delete "${selectedChat.name}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/messages/groups/${selectedChat.id}`);
        setShowGroupMenu(false);
        setSelectedChat(null);
        setGroupInfo(null);
        fetchChatUsers(); // Refresh chat list
      } catch (error) {
        console.error('Error deleting group:', error);
        const errorMessage = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete group. Please try again.'
          : 'Failed to delete group. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedChat || !selectedChat.isGroup) return;
    try {
      await axios.delete(`/messages/groups/${selectedChat.id}/members/${memberId}`);
      setShowRemoveMemberModal(false);
      setSelectedMemberToRemove(null);
      fetchGroupInfo(selectedChat.id); // Refresh group info
      fetchChatUsers(); // Refresh chat list
    } catch (error) {
      console.error('Error removing member:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to remove member. Please try again.'
        : 'Failed to remove member. Please try again.';
      alert(errorMessage);
    }
  };

  const handleAddMembers = async (memberIds: string[]) => {
    if (!selectedChat || !selectedChat.isGroup || memberIds.length === 0) return;
    try {
      await axios.post(`/messages/groups/${selectedChat.id}/members`, { memberIds });
      setShowAddMemberModal(false);
      fetchGroupInfo(selectedChat.id); // Refresh group info
      fetchChatUsers(); // Refresh chat list
    } catch (error) {
      console.error('Error adding members:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to add members. Please try again.'
        : 'Failed to add members. Please try again.';
      alert(errorMessage);
    }
  };

  const canManageGroup = (): boolean => {
    if (!selectedChat || !selectedChat.isGroup || !groupInfo) return false;
    // User can manage if they're the creator, an admin, or if it's a general group (no one can manage)
    return (groupInfo.createdBy === user?.id || user?.role === 'ADMIN') && !groupInfo.isGeneral;
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    setCreatingGroup(true);
    try {
      const response = await axios.post('/messages/groups', {
        name: groupForm.name,
        description: groupForm.description,
        memberIds: groupForm.memberIds
      });

      if (response.data.success) {
        const newGroup = response.data.data;
        // Add the new group to chat users
        setChatUsers(prev => [newGroup, ...prev]);
        setShowCreateGroupModal(false);
        setGroupForm({ name: '', description: '', memberIds: [] });
        // Select the newly created group
        setSelectedChat(newGroup);
      }
    } catch (error: unknown) {
      console.error('Error creating group:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create group'
        : 'Failed to create group';
      alert(errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setGroupForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId]
    }));
  };

  // Filter chat users based on search term
  const filteredChatUsers = chatUsers.filter(chatUser =>
    chatUser.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(user?.role === 'MENTOR' || user?.role === 'ADMIN') && (
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChatUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? `No conversations found matching "${searchTerm}"` : "No chat users available"}
            </div>
          ) : (
            filteredChatUsers.map((chatUser) => (
              <div
                key={chatUser.id}
                onClick={() => setSelectedChat(chatUser)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChat?.id === chatUser.id
                    ? "bg-blue-50 border-r-2 border-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {chatUser.name.charAt(0)}
                      </span>
                    </div>
                    {chatUser.avatar && (
                      <img
                        src={getAvatarUrl(chatUser.avatar)}
                        alt={chatUser.name}
                        className="w-10 h-10 rounded-full object-cover absolute top-0 left-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {chatUser.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-900 truncate leading-snug">
                      {chatUser.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate leading-snug">
                      {chatUser.isGroup
                        ? "Group Chat"
                        : chatUser.role.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {selectedChat.name.charAt(0)}
                    </span>
                  </div>
                  {selectedChat.avatar && (
                    <img
                      src={getAvatarUrl(selectedChat.avatar)}
                      alt={selectedChat.name}
                      className="w-10 h-10 rounded-full object-cover absolute top-0 left-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  {selectedChat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-900 truncate leading-snug">
                    {selectedChat.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate leading-snug">
                    {selectedChat.isGroup
                      ? "Group Chat"
                      : selectedChat.online
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 relative">
                {!selectedChat.isGroup && (
                  <>
                    <button 
                      onClick={handlePhoneCall}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={handleVideoCall}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Video Call"
                    >
                      <Video className="h-5 w-5" />
                    </button>
                  </>
                )}
                <div className="relative" ref={selectedChat.isGroup ? groupMenuRef : menuRef}>
                  <button 
                    onClick={() => {
                      if (selectedChat.isGroup) {
                        setShowGroupMenu(!showGroupMenu);
                      } else {
                        setShowMenu(!showMenu);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="More options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  
                  {/* Direct Chat Dropdown Menu */}
                  {!selectedChat.isGroup && showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      <button
                        onClick={handleViewProfile}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>View Profile</span>
                      </button>
                      <button
                        onClick={handleArchiveChat}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Archive Chat</span>
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear Chat</span>
                      </button>
                    </div>
                  )}

                  {/* Group Chat Dropdown Menu */}
                  {selectedChat.isGroup && showGroupMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      <button
                        onClick={() => {
                          setShowGroupMenu(false);
                          // Show members list - we'll add this as a section below
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Users className="h-4 w-4" />
                        <span>View Members ({groupInfo?.members.length || 0})</span>
                      </button>
                      {canManageGroup() && (
                        <>
                          <button
                            onClick={() => {
                              setShowAddMemberModal(true);
                              setShowGroupMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Add Members</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleLeaveGroup}
                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Leave Group</span>
                      </button>
                      {canManageGroup() && (
                        <>
                          <button
                            onClick={handleDeleteGroup}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Group</span>
                          </button>
                          <button
                            onClick={handleClearChat}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Clear Chat</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Group Members List (if group chat) */}
            {selectedChat.isGroup && groupInfo && (
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Group Members ({groupInfo.members.length})</p>
                  {groupInfo.creator && (
                    <p className="text-xs text-gray-500">Created by {groupInfo.creator.name}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupInfo.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-gray-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-700">{member.name}</span>
                      {canManageGroup() && member.id !== user?.id && (
                        <button
                          onClick={() => {
                            setSelectedMemberToRemove(member);
                            setShowRemoveMemberModal(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Remove member"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.senderId === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {message.senderId !== user?.id && (
                      <div className="relative flex-shrink-0 self-end mb-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {message.sender.name.charAt(0)}
                          </span>
                        </div>
                        {message.sender.avatar && (
                          <img
                            src={getAvatarUrl(message.sender.avatar)}
                            alt={message.sender.name}
                            className="w-8 h-8 rounded-full object-cover absolute top-0 left-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col">
                      {selectedChat.isGroup &&
                        message.senderId !== user?.id && (
                          <p className="text-xs font-medium text-gray-700 mb-1 px-1">
                            {message.sender.name}
                          </p>
                        )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.senderId === user?.id
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                    {message.senderId === user?.id && (
                      <div className="relative flex-shrink-0 self-end mb-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user?.name.charAt(0)}
                          </span>
                        </div>
                        {user?.avatar && (
                          <img
                            src={getAvatarUrl(user.avatar)}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover absolute top-0 left-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Group Chat</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setGroupForm({ name: '', description: '', memberIds: [] });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Business Planning Group"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description for the group"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Members
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {availableMembers.length === 0 ? (
                    <p className="text-sm text-gray-500">No members available</p>
                  ) : (
                    <div className="space-y-2">
                      {availableMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={groupForm.memberIds.includes(member.id)}
                            onChange={() => toggleMemberSelection(member.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="relative flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {member.name.charAt(0)}
                                </span>
                              </div>
                              {member.avatar && (
                                <img
                                  src={getAvatarUrl(member.avatar)}
                                  alt={member.name}
                                  className="w-8 h-8 rounded-full object-cover absolute top-0 left-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{member.role.toLowerCase()}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {groupForm.memberIds.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {groupForm.memberIds.length} member{groupForm.memberIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setGroupForm({ name: '', description: '', memberIds: [] });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupForm.name.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>{creatingGroup ? 'Creating...' : 'Create Group'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMemberModal && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Members to {selectedChat.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto">
              {availableMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No members available</p>
              ) : (
                <div className="space-y-2">
                  {availableMembers
                    .filter(member => !groupInfo?.members.some(m => m.id === member.id))
                    .map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={groupForm.memberIds.includes(member.id)}
                          onChange={() => {
                            setGroupForm(prev => ({
                              ...prev,
                              memberIds: prev.memberIds.includes(member.id)
                                ? prev.memberIds.filter(id => id !== member.id)
                                : [...prev.memberIds, member.id]
                            }));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {member.name.charAt(0)}
                              </span>
                            </div>
                            {member.avatar && (
                              <img
                                src={getAvatarUrl(member.avatar)}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover absolute top-0 left-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{member.role.toLowerCase()}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setGroupForm(prev => ({ ...prev, memberIds: [] }));
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (groupForm.memberIds.length > 0) {
                    handleAddMembers(groupForm.memberIds);
                    setGroupForm(prev => ({ ...prev, memberIds: [] }));
                  }
                }}
                disabled={groupForm.memberIds.length === 0}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add {groupForm.memberIds.length > 0 ? `(${groupForm.memberIds.length})` : ''} Members
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && selectedMemberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Remove Member</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMemberToRemove(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove <strong>{selectedMemberToRemove.name}</strong> from this group?
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMemberToRemove(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveMember(selectedMemberToRemove.id);
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && profileUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Profile</h3>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {loadingProfile ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-2xl font-medium">
                        {profileUser.name.charAt(0)}
                      </span>
                    </div>
                    {profileUser.avatar && (
                      <img
                        src={getAvatarUrl(profileUser.avatar)}
                        alt={profileUser.name}
                        className="w-20 h-20 rounded-full object-cover absolute top-0 left-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{profileUser.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">{profileUser.role.toLowerCase()}</p>
                    {profileUser.email && (
                      <p className="text-sm text-gray-600 mt-1">{profileUser.email}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {profileUser.status?.toLowerCase() || 'Active'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Verified</p>
                      <p className="font-medium text-gray-900">
                        {profileUser.verified ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
