import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Image, FileText, Music, Video, Download, ExternalLink } from 'lucide-react';
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

                {message.message_type !== 'text' && message.media_url && (
                  <div className="mb-3">
                    {message.message_type === 'image' && (
                      <div className="relative group">
                        <img
                          src={message.media_url}
                          alt={message.content || 'Imagem'}
                          className="max-w-full max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain"
                          onClick={() => window.open(message.media_url!, '_blank')}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="hidden items-center justify-center gap-2 p-4 bg-gray-100 rounded-lg border border-gray-200">
                          <Image className="w-5 h-5 text-gray-400" />
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            Abrir imagem
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}

                    {message.message_type === 'video' && (
                      <div className="relative group">
                        <div className="relative">
                          <video
                            src={message.media_url}
                            className="max-w-full rounded-lg"
                            controls
                            preload="metadata"
                          >
                            Seu navegador não suporta vídeo.
                          </video>
                        </div>
                        <a
                          href={message.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir vídeo em nova aba
                        </a>
                      </div>
                    )}

                    {message.message_type === 'audio' && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <audio
                          src={message.media_url}
                          controls
                          className="w-full"
                        >
                          Seu navegador não suporta áudio.
                        </audio>
                        <a
                          href={message.media_url}
                          download
                          className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          <Download className="w-4 h-4" />
                          Baixar áudio
                        </a>
                      </div>
                    )}

                    {message.message_type === 'document' && (
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${isAgent ? 'bg-white/10' : 'bg-gray-50'}`}>
                        <FileText className={`w-8 h-8 ${isAgent ? 'text-white' : 'text-emerald-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isAgent ? 'text-white' : 'text-gray-900'}`}>
                            {message.content || 'Documento'}
                          </p>
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className={`inline-flex items-center gap-2 text-xs mt-1 ${isAgent ? 'text-white/80 hover:text-white' : 'text-emerald-600 hover:text-emerald-700'}`}
                          >
                            <Download className="w-3 h-3" />
                            Baixar documento
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {message.content && message.message_type === 'text' && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )}

                {message.content && message.message_type !== 'text' && message.content !== '[Imagem]' && message.content !== '[Vídeo]' && message.content !== '[Áudio]' && message.content !== '[Documento]' && (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words mt-2 ${isAgent ? 'text-white/90' : 'text-gray-700'}`}>
                    {message.content}
                  </p>
                )}

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
