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

  const getFileName = (message: Message): string => {
    const metadata = message.metadata as any;
    const messageId = message.message_id_external || message.id;
    
    // Tentar extrair nome do arquivo do metadata
    let fileName = '';
    let extension = '';

    if (metadata?.message) {
      const msg = metadata.message;
      
      if (msg.documentMessage) {
        fileName = msg.documentMessage.fileName || msg.documentMessage.title || '';
        // Se já tem extensão no nome, usar ela
        if (fileName && fileName.includes('.')) {
          return fileName;
        }
        // Tentar extrair do mimetype
        const mimeType = msg.documentMessage.mimetype || '';
        if (mimeType) {
          const mimeToExt: Record<string, string> = {
            'application/pdf': 'pdf',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/vnd.ms-powerpoint': 'ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'text/csv': 'csv',
            'text/plain': 'txt',
            'application/zip': 'zip',
            'application/x-rar-compressed': 'rar',
          };
          extension = mimeToExt[mimeType] || 'bin';
        } else {
          extension = 'bin';
        }
        // Se não tem fileName, usar padrão
        if (!fileName) {
          fileName = `documento_${messageId}`;
        }
      } else if (msg.imageMessage) {
        // Formatos aceitos pelo WhatsApp: JPEG, PNG, GIF, WEBP
        const mimeType = msg.imageMessage.mimetype || 'image/jpeg';
        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
        };
        extension = mimeToExt[mimeType] || 'jpg';
        fileName = `imagem_${messageId}`;
      } else if (msg.videoMessage) {
        // Formatos aceitos pelo WhatsApp: MP4, 3GP
        const mimeType = msg.videoMessage.mimetype || 'video/mp4';
        const mimeToExt: Record<string, string> = {
          'video/mp4': 'mp4',
          'video/3gpp': '3gp',
          'video/3gp': '3gp',
        };
        extension = mimeToExt[mimeType] || 'mp4';
        fileName = `video_${messageId}`;
      } else if (msg.audioMessage) {
        // Formatos aceitos pelo WhatsApp: OGG/OPUS (nativo), MP3, AAC, AMR
        const mimeType = msg.audioMessage.mimetype || 'audio/ogg; codecs=opus';
        const mimeToExt: Record<string, string> = {
          'audio/ogg': 'ogg',
          'audio/ogg; codecs=opus': 'ogg',
          'audio/opus': 'ogg',
          'audio/mpeg': 'mp3',
          'audio/mp3': 'mp3',
          'audio/aac': 'aac',
          'audio/amr': 'amr',
        };
        extension = mimeToExt[mimeType] || 'ogg';
        fileName = `audio_${messageId}`;
      }
    }

    // Se não encontrou nome do arquivo, usar padrão baseado no tipo
    if (!fileName) {
      const typeDefaults: Record<string, string> = {
        image: 'imagem',
        video: 'video',
        audio: 'audio',
        document: 'documento',
      };
      fileName = typeDefaults[message.message_type] || 'arquivo';
    }

    // Se não encontrou extensão, usar padrão baseado no tipo (formatos aceitos pelo WhatsApp)
    if (!extension) {
      const typeDefaults: Record<string, string> = {
        image: 'jpg',      // JPEG é o padrão do WhatsApp
        video: 'mp4',      // MP4 é o padrão do WhatsApp
        audio: 'ogg',      // OGG/OPUS é o formato nativo do WhatsApp
        document: 'bin',   // Documentos podem ter qualquer extensão
      };
      extension = typeDefaults[message.message_type] || 'bin';
    }

    // Se o fileName já tem extensão, retornar como está
    if (fileName.includes('.')) {
      return fileName;
    }

    return `${fileName}.${extension}`;
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col gap-4">
        {messages.map((message) => {
          const isAgent = message.sender_type === 'agent';
          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 max-w-lg ${isAgent ? 'self-end' : ''}`}
            >
              <div className={`flex flex-col gap-1 ${isAgent ? 'items-end' : ''}`}>
                <div
                  className={`rounded-lg shadow-sm ${
                    isAgent
                      ? 'rounded-br-none bg-primary/90 dark:bg-primary text-white'
                      : 'rounded-bl-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  } p-3`}
                >

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
                        <div className="hidden items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <Image className="w-5 h-5 text-gray-400" />
                          <div className="flex items-center gap-3">
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm flex items-center gap-1 ${isAgent ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'}`}
                            >
                              Abrir imagem
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <a
                              href={message.media_url}
                              download={getFileName(message)}
                              className={`text-sm flex items-center gap-1 ${isAgent ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'}`}
                            >
                              Baixar imagem
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                            onClick={(e) => e.stopPropagation()}
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a
                            href={message.media_url}
                            download={getFileName(message)}
                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                            onClick={(e) => e.stopPropagation()}
                            title="Baixar imagem"
                          >
                            <Download className="w-4 h-4" />
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
                        <div className="mt-2 flex items-center gap-3">
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm ${isAgent ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80'}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Abrir vídeo em nova aba
                          </a>
                          <a
                            href={message.media_url}
                            download={getFileName(message)}
                            className={`inline-flex items-center gap-2 text-sm ${isAgent ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80'}`}
                          >
                            <Download className="w-4 h-4" />
                            Baixar vídeo
                          </a>
                        </div>
                      </div>
                    )}

                    {message.message_type === 'audio' && (
                      <div className={`rounded-lg p-3 ${isAgent ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <audio
                          src={message.media_url}
                          controls
                          className="w-full"
                        >
                          Seu navegador não suporta áudio.
                        </audio>
                        <a
                          href={message.media_url}
                          download={getFileName(message)}
                          className={`mt-2 inline-flex items-center gap-2 text-sm ${isAgent ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80'}`}
                        >
                          <Download className="w-4 h-4" />
                          Baixar áudio
                        </a>
                      </div>
                    )}

                    {message.message_type === 'document' && (
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${isAgent ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <FileText className={`w-8 h-8 ${isAgent ? 'text-white' : 'text-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isAgent ? 'text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                            {message.content || getFileName(message)}
                          </p>
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={getFileName(message)}
                            className={`inline-flex items-center gap-2 text-xs mt-1 ${isAgent ? 'text-white/80 hover:text-white' : 'text-primary hover:text-primary/80'}`}
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
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words mt-2 ${isAgent ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                    {message.content}
                  </p>
                )}
                </div>
                <div className={`flex items-center gap-1 text-xs px-1 ${isAgent ? 'justify-end' : ''}`}>
                  <span className="text-gray-400 dark:text-gray-500">{formatTime(message.created_at)}</span>
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
