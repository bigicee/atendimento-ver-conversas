import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Image, FileText, Music, Video } from 'lucide-react';
import { Message } from '../lib/supabase';

interface MessageListProps {
  messages: Message[];
  contactName: string;
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => {
          const isAgent = message.sender_type === 'agent';
          return (
            <div
              key={message.id}
              className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isAgent
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {!isAgent && message.sender_name && (
                  <div className="text-xs font-semibold text-emerald-600 mb-1">
                    {message.sender_name}
                  </div>
                )}

                {message.message_type !== 'text' && (
                  <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isAgent ? 'border-white/20' : 'border-gray-200'}`}>
                    {getMediaIcon(message.message_type)}
                    <span className="text-sm font-medium">
                      {message.message_type.charAt(0).toUpperCase() + message.message_type.slice(1)}
                    </span>
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>

                <div className={`flex items-center gap-1 justify-end mt-1 text-xs ${
                  isAgent ? 'text-white/80' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.created_at)}</span>
                  {isAgent && getStatusIcon(message.status)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
