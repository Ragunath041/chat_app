import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background animate-gradient-x">
      <div className="max-w-2xl w-full p-8 text-center space-y-8">
        <div className="space-y-4 animate-fade-in [animation-delay:200ms]">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to the Modern Chat App
          </h1>
          <p className="text-xl text-muted-foreground">
            Experience real-time messaging with a beautiful, intuitive interface
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:400ms]">
          <Button
            size="lg"
            variant="default"
            className="group"
            onClick={() => navigate('/login')}
          >
            Login
            <LogIn className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="group"
            onClick={() => navigate('/register')}
          >
            Register
            <UserPlus className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="group"
            onClick={() => navigate('/chat')}
          >
            Start Chatting
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-16 animate-fade-in [animation-delay:600ms]">
          <div className="p-6 rounded-xl bg-card border">
            <h3 className="text-lg font-semibold mb-2">Real-time Messaging</h3>
            <p className="text-muted-foreground">
              Instant message delivery with typing indicators and read receipts
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-card border">
            <h3 className="text-lg font-semibold mb-2">Multiple Channels</h3>
            <p className="text-muted-foreground">
              Organize conversations into different channels and topics
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-card border">
            <h3 className="text-lg font-semibold mb-2">Modern Interface</h3>
            <p className="text-muted-foreground">
              Clean and intuitive design with smooth animations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
