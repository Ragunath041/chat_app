
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/utils/mockData';

interface UserAvatarProps {
  user: User;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  showStatus = true,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };
  
  const statusSizeClasses = {
    sm: 'h-2.5 w-2.5 right-0 bottom-0',
    md: 'h-3 w-3 right-0 bottom-0',
    lg: 'h-4 w-4 right-0.5 bottom-0.5'
  };
  
  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>
          {user.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span 
          className={`absolute ${statusSizeClasses[size]} ${getStatusColor(user.status)} rounded-full ring-2 ring-white`}
          aria-label={`Status: ${user.status}`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
