import React from 'react';
import { User, useChat } from '@/context/ChatContext';
import { Users } from 'lucide-react';

interface UserListProps {
  users: User[];
  currentUserId: string;
  onUserSelect: (user: User) => void;
}

const UserSidebar: React.FC<UserListProps> = ({ users, currentUserId, onUserSelect }) => {
  // Filter out the current user
  const otherUsers = users.filter(user => user.id !== currentUserId);

  // Function to handle user selection
  const handleUserClick = (user: User) => {
    onUserSelect(user);
  };

  return (
    <div className="w-72 bg-gradient-to-b from-card to-card/95 h-full flex flex-col overflow-hidden shadow-lg border-r">
      <div className="p-5 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {/* <h2 className="text-xl font-bold gradient-text">Contacts</h2> */}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Online Users ({otherUsers.length})
            </h3>
            <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md">
              {otherUsers.length} available
            </span>
          </div>
          
          <div className="space-y-2">
            {otherUsers.length > 0 ? (
              otherUsers.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors border border-transparent hover:border-primary/20 user-item"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border flex items-center justify-center shadow-sm">
                      <span className="text-primary font-semibold">
                        {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user && user.username ? user.username : 'Unknown User'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                <p className="text-sm text-muted-foreground mb-2">No other users available</p>
                <p className="text-xs text-muted-foreground/70">Check back later</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSidebar;