import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, X, Image as ImageIcon } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

interface MessageInputProps {
  disabled?: boolean;
  selectedUserId?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ disabled = false, selectedUserId }) => {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, setIsTyping } = useChat();
  
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (message) {
      setIsTyping(true);
      typingTimeout = setTimeout(() => setIsTyping(false), 1000);
    } else {
      setIsTyping(false);
    }
    
    return () => clearTimeout(typingTimeout);
  }, [message, setIsTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !imageFile) || disabled || !selectedUserId) return;
    
    try {
      // Handle image upload and message sending
      if (imageFile) {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Create a FormData object to send the image
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Upload the image to our API
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadData = await uploadResponse.json();
        const imageUrl = `http://localhost:5000${uploadData.imageUrl}`;
        
        // Format the message with image information
        const imageCaption = message.trim() 
          ? message
          : '';
        
        // Send the message with image data including the URL
        await sendMessage(
          `${imageCaption} [Image: ${uploadData.filename}]`, 
          selectedUserId,
          'image',
          imageUrl
        );
        
        clearImage();
      } else {
        // Just send a regular text message
        await sendMessage(message.trim(), selectedUserId);
      }
      
      setMessage('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setImageFile(file);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card/95 backdrop-blur border-t">
      {imagePreview && (
        <div className="mb-3 max-w-3xl mx-auto relative">
          <div className="rounded-xl overflow-hidden border shadow-sm relative group">
            <img 
              src={imagePreview} 
              alt="Upload preview" 
              className="max-h-64 w-auto mx-auto object-contain"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 ml-1 flex items-center">
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            {imageFile?.name ? (
              <span className="truncate max-w-[200px]">{imageFile.name}</span>
            ) : (
              <span>Image selected</span>
            )}
            <span className="ml-1">({Math.round((imageFile?.size || 0) / 1024)} KB)</span>
          </div>
        </div>
      )}
      
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
        
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="flex-shrink-0 rounded-full h-10 w-10 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
          onClick={handleAttachmentClick}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-grow">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Select a user to start chatting" : imageFile ? "Add a caption..." : "Type a message..."}
            className="min-h-[2.75rem] max-h-32 py-2.5 px-4 resize-none rounded-3xl border shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            rows={1}
            disabled={disabled}
          />
        </div>
        
        <Button 
          type="submit" 
          size="icon"
          className={`flex-shrink-0 rounded-full h-10 w-10 ${
            (!message.trim() && !imageFile) || disabled
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary hover:bg-primary/90 text-white shadow-md'
          } transition-all duration-200 ${
            message.trim() || imageFile ? 'scale-100' : 'scale-95'
          }`}
          disabled={(!message.trim() && !imageFile) || disabled}
        >
          <Send className={`h-5 w-5 ${message.trim() || imageFile ? 'scale-100' : 'scale-90'} transition-transform duration-200`} />
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;
