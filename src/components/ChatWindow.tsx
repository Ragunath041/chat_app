import React, { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday, parseISO, differenceInDays } from 'date-fns';
import { Check, CheckCheck, MessageSquare, ImageIcon, X, Search, Phone, MoreVertical } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { Message } from '@/context/ChatContext';

// Extended User interface with status property
interface User {
  id: string;
  username: string;
  status?: 'online' | 'offline';
}

interface ChatWindowProps {
  messages?: Message[];
  selectedUser: User | null;
  currentUser: User | null;
  isTyping?: boolean;
}

const MessageStatus = ({ status }: { status: Message['status'] }) => {
  switch (status) {
    case 'sent':
      return <Check className="h-4 w-4" />;
    case 'delivered':
      return <CheckCheck className="h-4 w-4 text-gray-500" />;
    case 'read':
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    case 'error':
      return <span className="text-destructive text-xs">Failed</span>;
    default:
      return null;
  }
};

const TypeIndicator: React.FC = () => {
  return (
    <div className="bg-card rounded-2xl px-4 py-3 shadow-sm border border-border/40 flex items-center space-x-1.5">
      <div className="typing-dot bg-gray-700 h-2 w-2 rounded-full animate-pulse"></div>
      <div className="typing-dot bg-gray-700 h-2 w-2 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
      <div className="typing-dot bg-gray-700 h-2 w-2 rounded-full animate-pulse [animation-delay:-0.6s]"></div>
    </div>
  );
};

const ImageModal = ({ imageUrl, imageName, onClose }: { imageUrl: string; imageName: string; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full overflow-hidden rounded-xl shadow-2xl">
        <button 
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-6 w-6" />
        </button>
        <img 
          src={imageUrl} 
          alt={imageName} 
          className="w-full h-auto max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

// Helper function to format the timestamp correctly
const formatMessageTime = (timestamp: any): string => {
  try {
    let date: Date;
    
    // If no timestamp provided, or invalid, use current time
    if (!timestamp || timestamp === 'Invalid Date') {
      return format(new Date(), 'h:mm a');
    }
    
    // If it's a number in seconds (Unix timestamp), convert to milliseconds
    if (typeof timestamp === 'number') {
      // Check if it needs to be multiplied by 1000 (seconds to ms conversion)
      if (timestamp < 10000000000) { // If timestamp is in seconds (before 2286)
        date = new Date(timestamp * 1000);
      } else {
        date = new Date(timestamp);
      }
    } 
    // If it's a string, try to parse it
    else if (typeof timestamp === 'string') {
      // Check if it's a numeric string
      if (!isNaN(Number(timestamp))) {
        const numTimestamp = Number(timestamp);
        if (numTimestamp < 10000000000) { // If timestamp is in seconds
          date = new Date(numTimestamp * 1000);
        } else {
          date = new Date(numTimestamp);
        }
      } else {
        // Try to parse as ISO string
        date = new Date(timestamp);
      }
    } else {
      // Fallback to current time if nothing else works
      date = new Date();
    }
    
    // If date is invalid after all attempts, use current time
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    
    // Different format based on how old the message is
    if (isToday(date)) {
      return format(date, 'h:mm a'); // Today: just show time
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'h:mm a'); // Yesterday: show "Yesterday" + time
    } else if (differenceInDays(new Date(), date) < 7) {
      return format(date, 'EEE h:mm a'); // Within a week: show day name + time
    } else {
      return format(date, 'MMM d, h:mm a'); // Older: show month, day + time
    }
  } catch (error) {
    console.error('Error formatting time:', error);
    return format(new Date(), 'h:mm a');
  }
};

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedUser }) => {
  const { messages, currentUser, isTyping } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleImageClick = (url: string, name: string) => {
    setSelectedImage({ url, name });
  };

  const renderMessage = (message: Message, index: number) => {
    const isSentByCurrentUser = message.senderId === currentUser?.id;
    const showAvatar = index === 0 || 
      messages[index - 1].senderId !== message.senderId;
    
    // Check if message contains an image reference
    const isImageMessage = message.type === 'image' || (!message.type && message.text.includes('[Image:'));
    const imageMatch = isImageMessage ? message.text.match(/\[Image: (.*?)\]/) : null;
    const hasImage = !!imageMatch;
    const messageText = hasImage 
      ? message.text.replace(/\[Image: (.*?)\]/, '').trim()
      : message.text;
    const imageName = hasImage && imageMatch ? imageMatch[1] : '';
    
    // Get or construct image URL
    let imageUrl = message.imageUrl || null;
    if (!imageUrl && hasImage && imageName) {
      // Try to construct URL from imageName
      const filename = imageName.split('/').pop();
      if (filename) {
        imageUrl = `http://localhost:5000/api/uploads/${filename}`;
      }
    }
    
    return (
      <div
        key={message.id}
        className={`flex items-end gap-4 px-5 py-2 ${
          isSentByCurrentUser ? 'flex-row-reverse' : ''
        }`}
      >
        <div className={`flex-shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border border-white/20 flex items-center justify-center shadow-md">
              <span className="text-primary font-semibold text-xs">
                {isSentByCurrentUser 
                  ? (currentUser && currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?')
                  : (selectedUser && selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : '?')}
              </span>
            </div>
          </div>
        </div>
        
        <div className={`flex flex-col ${isSentByCurrentUser ? 'items-end' : ''} max-w-xs md:max-w-md`}>
          {showAvatar && (
            <span className="text-xs text-muted-foreground mb-1.5 ml-1">
              {isSentByCurrentUser ? 'You' : selectedUser?.username || 'User'}
            </span>
          )}
          
          <div className={`flex items-end gap-2 ${isSentByCurrentUser ? 'flex-row-reverse' : ''} w-full`}>
            <div className={`overflow-hidden rounded-2xl shadow-sm ${
              isSentByCurrentUser 
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' 
                : 'bg-card border border-border/40'
            } ${hasImage ? 'w-full' : ''}`}>
              {hasImage && (
                <div className="relative">
                  {imageUrl ? (
                    <div 
                      className="cursor-pointer overflow-hidden" 
                      onClick={() => handleImageClick(imageUrl as string, imageName)}
                    >
                      <div className="relative group">
                        <img 
                          src={imageUrl} 
                          alt={imageName} 
                          className="w-full object-contain max-h-[300px]" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all duration-200">
                          <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-2 transform scale-90 group-hover:scale-100 transition-all duration-200">
                            <span className="text-xs px-2">View full size</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-muted flex items-center justify-center">
                      <div className="py-12 px-4 text-center">
                        <div className="rounded-full bg-primary/10 p-3 mb-2 inline-flex">
                          <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">{imageName}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {messageText && (
                <div className={`${hasImage ? 'px-4 py-3 border-t' : 'px-4 py-2.5'}`}>
                  {messageText}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <time>{
                // For freshly sent messages, sometimes the timestamp might not be correctly set
                // So if it's a sent message from the current user with an invalid date, show current time
                (isSentByCurrentUser && 
                 message.status === 'sent' && 
                 (new Date(message.timestamp).toString() === 'Invalid Date' || 
                  !message.timestamp)) ? 
                  format(new Date(), 'h:mm a') : 
                  formatMessageTime(message.timestamp)
              }</time>
              {isSentByCurrentUser && <MessageStatus status={message.status} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background to-background/95">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center floating max-w-md">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-md p-5 shadow-lg">
                <MessageSquare className="h-full w-full text-primary/70" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              Welcome to Chat App
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-balance">
              Select a user from the sidebar to start chatting or search for someone specific
            </p>
            <div className="flex justify-center space-x-2">
              <span className="h-2.5 w-2.5 bg-gray-700 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2.5 w-2.5 bg-gray-700 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2.5 w-2.5 bg-gray-700 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full border-l">
      <div className="p-4 border-b bg-card shadow-sm">
        <div className="flex items-center">
          <div className="relative mr-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border border-white/20 flex items-center justify-center shadow-md">
              <span className="text-primary font-semibold">
                {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
          </div>
          <div>
            <h2 className="font-medium">{selectedUser.username}</h2>
          </div>
          <div className="ml-auto flex">
            <button className="p-2 rounded-full hover:bg-accent">
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-accent">
              <Phone className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-accent">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-muted w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Send a message to start the conversation with {selectedUser.username}
              </p>
            </div>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
          {isTyping && (
            <div className="flex items-end gap-3 px-5 py-2">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border border-white/20 flex items-center justify-center shadow-md">
                    <span className="text-primary font-semibold text-xs">
                      {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <TypeIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
