import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWindow from '@/components/ChatWindow';
import MessageInput from '@/components/MessageInput';
import UserSidebar from '@/components/UserSidebar';
import { User, Message, useChat } from '@/context/ChatContext';
import { UserIcon, Download, LogOut, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Chat = () => {
  const { currentUser, allUsers, fetchAllUsers, loadMessages, messages, setMessages } = useChat();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backupUserId, setBackupUserId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!currentUser) {
      navigate('/login');
    } else {
      // Fetch all users when the component mounts
      fetchAllUsers();
    }
  }, [currentUser, navigate, fetchAllUsers]);

  // Poll for users occasionally to refresh the list
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        fetchAllUsers();
      }
    }, 60000); // Poll every minute
    
    return () => clearInterval(interval);
  }, [currentUser, fetchAllUsers]);

  // Handle user selection and load messages
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    
    // Load messages between current user and selected user
    loadMessages(user.id);
  };

  // Poll for new messages when a user is selected
  useEffect(() => {
    if (!selectedUser) return;
    
    // Initial load
    loadMessages(selectedUser.id);
    
    // Poll for new messages every 2 seconds when a user is selected
    const messageInterval = setInterval(() => {
      loadMessages(selectedUser.id);
    }, 2000);
    
    return () => clearInterval(messageInterval);
  }, [selectedUser, loadMessages]);

  // Clear messages when no user is selected
  useEffect(() => {
    if (!selectedUser && messages.length > 0) {
      setMessages([]);
    }
  }, [selectedUser, messages.length, setMessages]);

  // Function to handle chat backup
  const handleBackupChat = async () => {
    if (!backupUserId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Get conversation with selected user
      const response = await fetch(`http://localhost:5000/api/messages/${backupUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      // Format messages to a more readable format
      const chatHistory = data.messages.map((msg: Message) => {
        const sender = msg.senderId === currentUser?.id ? 'You' : 
          allUsers.find(u => u.id === msg.senderId)?.username || 'Unknown';
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${sender}: ${msg.text}`;
      }).join('\n');
      
      // Create a file to download
      const selectedUserName = allUsers.find(u => u.id === backupUserId)?.username || 'user';
      const fileName = `chat_with_${selectedUserName}_${new Date().toISOString().split('T')[0]}.txt`;
      const blob = new Blob([chatHistory], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setBackupDialogOpen(false);
    } catch (error) {
      console.error('Error backing up chat:', error);
      alert('Failed to backup chat. Please try again.');
    }
  };

  if (!currentUser) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex h-screen bg-background chat-pattern">
      {/* Profile Menu */}
      <div className="absolute top-4 left-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-card shadow-md profile-btn-glow">
              <UserIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-2 glass-effect">
            <DropdownMenuLabel className="text-lg font-medium">My Profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-white/50 shadow-xl flex items-center justify-center avatar-glow">
                  <span className="text-white font-bold text-lg">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-base gradient-text">{currentUser.username}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setBackupDialogOpen(true)}
              className="cursor-pointer flex items-center gap-2 py-2.5 my-1 rounded-lg hover:bg-primary/10"
            >
              <Download className="h-4 w-4" />
              <span>Backup Chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                navigate('/login');
              }}
              className="cursor-pointer flex items-center gap-2 text-destructive py-2.5 my-1 rounded-lg hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent className="sm:max-w-md glass-effect">
          <DialogHeader>
            <DialogTitle className="text-xl gradient-text">Backup Chat History</DialogTitle>
            <DialogDescription>
              Select a user to download your conversation history
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Select value={backupUserId} onValueChange={setBackupUserId}>
              <SelectTrigger className="modern-input">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="glass-effect">
                {allUsers
                  .filter(user => user.id !== currentUser.id)
                  .map(user => (
                    <SelectItem key={user.id} value={user.id} className="hover:bg-primary/10">
                      {user.username}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBackupChat} disabled={!backupUserId} className="bg-gradient-to-r from-primary to-accent text-white shadow-md">
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Sidebar */}
      <div className="hidden md:block">
        <UserSidebar 
          users={allUsers} 
          currentUserId={currentUser.id}
          onUserSelect={handleUserSelect}
        />
      </div>

      {/* Mobile Menu Toggle */}
      <div className="absolute top-4 left-20 md:hidden z-10">
        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-card shadow-md">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Chat Content */}
      <div className="flex-1 flex flex-col glass-panel mx-4 my-4 rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 h-[70px] border-b bg-card/95 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-white/20 shadow-md flex items-center justify-center">
              <span className="text-primary font-semibold">
                {selectedUser 
                  ? (selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : '?') 
                  : (currentUser && currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?')}
              </span>
            </div>
            <div>
              <h2 className="font-semibold">
                {selectedUser 
                  ? `Chat with ${selectedUser.username || 'User'}`
                  : currentUser ? `Welcome, ${currentUser.username || 'User'}` : 'Welcome'}
              </h2>
            </div>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            className="text-sm bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('userData');
              navigate('/login');
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Chat Area */}
        <ChatWindow selectedUser={selectedUser} currentUser={currentUser} />
        
        {/* Message Input - Only show when a user is selected */}
        {selectedUser && (
          <MessageInput disabled={!selectedUser} selectedUserId={selectedUser?.id} />
        )}
      </div>
    </div>
  );
};

export default Chat;
