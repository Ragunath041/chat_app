import React, { createContext, useContext, useState, useEffect } from 'react';

// Define interfaces (moved from mockData)
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'error';
  type?: 'text' | 'image';
  imageUrl?: string;
}

interface ChatContextType {
  currentUser: User | null;
  messages: Message[];
  allUsers: User[];
  sendMessage: (text: string, receiverId: string, type?: string, imageUrl?: string) => Promise<void>;
  loadMessages: (userId: string) => Promise<void>;
  isTyping: boolean;
  setIsTyping: (value: boolean) => void;
  setCurrentUser: (userData?: any) => void;
  fetchAllUsers: () => Promise<void>;
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Check if user is already logged in (via token)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.id && parsedUser.username && parsedUser.email) {
          setCurrentUserState(parsedUser);
          
          // Validate token with the server
          fetch('http://localhost:5000/api/auth/validate', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          .then(response => {
            if (!response.ok) {
              // If token is invalid, clear user data
              localStorage.removeItem('token');
              localStorage.removeItem('userData');
              setCurrentUserState(null);
              return;
            }
            
            // Fetch all users once we know the current user
            fetchAllUsers();
          })
          .catch(error => {
            console.error('Error validating token:', error);
            // For demo, we'll still keep the user logged in
            fetchAllUsers();
          });
        } else {
          // Invalid user data
          localStorage.removeItem('userData');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Fetch all users from the backend
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      // Update allUsers state with users from API
      setAllUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      // For demo purposes, create some mock users if API isn't available
      createMockUsers();
    }
  };

  // Helper to create mock users for demo
  const createMockUsers = () => {
    if (!currentUser) return;
    
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'alice',
        email: 'alice@example.com',
      },
      {
        id: '2',
        username: 'bob',
        email: 'bob@example.com',
      },
      {
        id: '3',
        username: 'charlie',
        email: 'charlie@example.com',
      },
      {
        id: '4',
        username: 'david',
        email: 'david@example.com',
      },
      {
        id: '5',
        username: 'emma',
        email: 'emma@example.com',
      }
    ];
    
    // Add the current user to the list
    setAllUsers([...mockUsers, currentUser]);
  };

  // Helper to set the current user
  const setCurrentUser = (userData?: any) => {
    if (userData) {
      // Create user object from authenticated user data
      const user: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar: `https://ui-avatars.com/api/?name=${userData.username}&background=0D8ABC&color=fff`,
      };
      
      // Save user data to localStorage for persistence
      localStorage.setItem('userData', JSON.stringify(user));
      
      setCurrentUserState(user);
      
      // Fetch all users after setting current user
      setTimeout(() => fetchAllUsers(), 500);
    } else {
      setCurrentUserState(null);
      setAllUsers([]);
    }
  };

  const sendMessage = async (text: string, receiverId: string, type: string = 'text', imageUrl?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !currentUser) return;
      
      const timestamp = new Date().toISOString();
      
      // Create a temporary message to display immediately
      const tempMessage: Message = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        receiverId,
        text,
        timestamp,
        status: 'sent',
        type,
        imageUrl
      };
      
      // Add to the messages state immediately for UI responsiveness
      setMessages(prev => [...prev, tempMessage]);
      
      // Send to server
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          receiverId,
          type,
          imageUrl,
          timestamp
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Update the message status with the server response
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...msg, id: data.message.id || data.message._id, status: 'delivered' } : msg
      ));
      
      // Trigger the message sent event
      // This could be used to update unread counts or other UI features
      onMessageSent?.(data.message);
      
      // Reload messages to get the updated list with the new message
      loadMessages(receiverId);
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the message status to show it failed
      setMessages(prev => prev.map(msg => 
        msg.text === text && msg.receiverId === receiverId && msg.status === 'sent' 
          ? { ...msg, status: 'error' } 
          : msg
      ));
    }
  };

  // Load messages between current user and another user
  const loadMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !currentUser) return;
      
      const response = await fetch(`http://localhost:5000/api/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      
      // Debug logging
      if (data.messages && data.messages.length > 0) {
        console.log("Message timestamp type:", typeof data.messages[0].timestamp);
        console.log("Message timestamp value:", data.messages[0].timestamp);
      }
      
      // Process messages to ensure all have proper fields including imageUrl
      const processedMessages = data.messages ? data.messages.map((msg: any) => {
        // Extract image information from message text
        const isImageMessage = msg.type === 'image' || 
          (!msg.type && msg.text.includes('[Image:'));
        const imageMatch = isImageMessage ? msg.text.match(/\[Image: (.*?)\]/) : null;
        
        // If it's an image message and doesn't have an imageUrl already, create one
        let imageUrl = msg.imageUrl;
        if (isImageMessage && imageMatch && !imageUrl) {
          const imageName = imageMatch[1];
          // Try to derive the image URL based on filename if it doesn't exist
          if (imageName) {
            const filename = imageName.split('/').pop();
            if (filename) {
              imageUrl = `http://localhost:5000/api/uploads/${filename}`;
            }
          }
        }
        
        return {
          id: msg.id || msg._id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          text: msg.text,
          timestamp: msg.timestamp,
          status: msg.status || 'delivered',
          type: msg.type || (isImageMessage ? 'image' : 'text'),
          imageUrl: imageUrl
        };
      }) : [];
      
      // Check if there are any new messages 
      // If current messages array is empty, just set the new messages
      if (messages.length === 0) {
        setMessages(processedMessages);
        return;
      }
      
      // Get the latest message we have
      const latestCurrentMessage = messages.length > 0 ? 
        messages[messages.length - 1] : null;
      
      // Get the new messages from the server
      const newMessages = processedMessages;
      
      // If we have no new messages or the same number of messages, check if we need to update
      if (newMessages.length <= messages.length) {
        // Only update if the latest message IDs are different
        const shouldUpdate = latestCurrentMessage && 
          newMessages.length > 0 && 
          newMessages[newMessages.length - 1].id !== latestCurrentMessage.id;
        
        if (shouldUpdate) {
          setMessages(newMessages);
        }
        return;
      }
      
      // We have new messages - update the state
      setMessages(newMessages);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const value = {
    currentUser,
    messages,
    allUsers,
    sendMessage,
    loadMessages,
    isTyping,
    setIsTyping,
    setCurrentUser,
    fetchAllUsers,
    setAllUsers,
    setMessages
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
