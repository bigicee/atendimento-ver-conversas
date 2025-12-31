
import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import Sidebar from '../components/Sidebar';
import { dbService } from '../services/supabase';
import { evolutionService } from '../services/evolution';

interface ChatPageProps {
  user: User;
  onLogout: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ user, onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [instanceName] = useState(`inst_${user.account_id}`);

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'groups' | 'individual'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');


  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedConv = conversations.find(c => c.id === selectedConversationId);

  // Fetch conversations // Initial load and auto-sync
  useEffect(() => {
    loadConversations();

    // Auto-sync on mount
    handleSync();

    // Auto-sync every 60 seconds (webhook will handle real-time updates)
    const syncInterval = setInterval(() => {
      handleSync();
    }, 60000);

    // Poll for new conversations every 5 seconds
    const pollInterval = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(pollInterval);
    };
  }, [user.account_id]);

  // Fetch messages when conversation changes and mark as read
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);

      // Mark conversation as read
      dbService.markConversationAsRead(selectedConversationId).then(() => {
        // Reload conversations to update unread count in UI
        loadConversations();
      });

      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        loadMessages(selectedConversationId);
      }, 3000);

      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const data: any = await dbService.getConversations(user.account_id);
    setConversations(data);
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const data: any = await dbService.getMessages(conversationId);
    setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversationId) return;

    setSending(true);
    const messageText = inputMessage;
    setInputMessage(''); // Clear input immediately for better UX

    const result: any = await dbService.sendMessage(selectedConversationId, messageText, instanceName);

    if (result.error) {
      console.error('Failed to send message:', result.error);
      setInputMessage(messageText); // Restore message on error
      alert('Erro ao enviar mensagem: ' + result.error);
    } else {
      // Reload messages to show the sent message
      await loadMessages(selectedConversationId);
      // Reload conversations to update last message
      await loadConversations();
    }

    setSending(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // DON'T clear data - just update/add new conversations

      // Fetch chats from Evolution API
      const result: any = await evolutionService.fetchChats(instanceName);

      if (result.error) {
        alert('Erro ao sincronizar: ' + result.error);
      } else if (result.chats && result.chats.length > 0) {
        console.log('Total chats received:', result.chats.length);

        // Process each chat
        let syncedCount = 0;
        let newCount = 0;
        let updatedCount = 0;

        for (const chat of result.chats) {
          // Skip if no lastMessage
          if (!chat.lastMessage || !chat.lastMessage.key) {
            continue;
          }

          const key = chat.lastMessage.key;
          const remoteJid = key.remoteJid || '';

          // Check if it's a group
          const isGroup = remoteJid.includes('@g.us');

          // Get contact phone
          let phone = '';

          if (isGroup) {
            phone = remoteJid.replace('@g.us', '');
          } else {
            phone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
          }

          // Skip invalid numbers
          if (!phone || phone.length < 10) {
            continue;
          }

          // Generate consistent conversation ID using normalized phone (digits only)
          const conversationId = `conv_${phone}`;
          const existingConv = conversations.find(c => c.id === conversationId);

          // Always fetch messages to check for new ones
          console.log('Fetching messages for:', { remoteJid, phone, isNew: !existingConv });

          const messagesResult: any = await evolutionService.fetchChatMessages(instanceName, remoteJid);

          if (messagesResult.error || !messagesResult.messages || messagesResult.messages.length === 0) {
            console.log('No messages found for:', remoteJid);
            continue;
          }

          console.log(`Found ${messagesResult.messages.length} messages`);

          // DEBUG: Check timestamp structure
          if (messagesResult.messages.length > 0) {
            const sampleMsg = messagesResult.messages[0];
            console.log('📋 Sample message keys:', Object.keys(sampleMsg));
            console.log('📅 messageTimestamp:', sampleMsg.messageTimestamp);
            console.log('📅 Timestamp type:', typeof sampleMsg.messageTimestamp);
            if (sampleMsg.messageTimestamp) {
              const date = new Date(sampleMsg.messageTimestamp * 1000);
              console.log('📅 Converted date:', date.toISOString());
              console.log('📅 Readable:', date.toLocaleString('pt-BR'));
            }
          }

          // Helper function to format phone number
          const formatPhone = (phoneNum: string) => {
            const digits = phoneNum.replace(/\D/g, '');
            if (digits.length >= 12 && digits.startsWith('55')) {
              const country = digits.substring(0, 2);
              const area = digits.substring(2, 4);
              const part1 = digits.substring(4, 9);
              const part2 = digits.substring(9, 13);
              return `+${country} (${area}) ${part1}-${part2}`;
            }
            return `+${digits}`;
          };

          // Extract contact name
          let contactName = '';

          if (isGroup) {
            const groupMeta: any = await evolutionService.fetchGroupMetadata(instanceName, remoteJid);
            contactName = groupMeta.name || `Grupo ${phone.substring(0, 15)}`;
          } else {
            // Try to find pushName from messages
            let foundPushName = false;
            for (const msg of messagesResult.messages) {
              if (msg.key && !msg.key.fromMe && msg.pushName && msg.pushName !== 'Você') {
                contactName = msg.pushName;
                foundPushName = true;
                break;
              }
            }
            // If no pushName found, use formatted phone
            if (!foundPushName) {
              contactName = formatPhone(phone);
            }
          }

          console.log('Contact name:', contactName);

          // Save/update conversation with all messages
          await dbService.saveConversationWithMessages(
            remoteJid,
            phone,
            contactName,
            user.account_id,
            isGroup,
            messagesResult.messages
          );

          if (existingConv) {
            updatedCount++;
          } else {
            newCount++;
          }
          syncedCount++;
        }

        console.log(`Sync complete: ${newCount} new, ${updatedCount} updated`);

        // Reload conversations to show updates
        await loadConversations();

        // Only show alert for new conversations, not updates
        if (newCount > 0) {
          alert(`${newCount} nova(s) conversa(s) sincronizada(s)!`);
        }
      } else {
        console.log('No chats found');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar mensagens');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('⚠️ Isso irá limpar TODAS as conversas e mensagens. Você precisará sincronizar novamente. Deseja continuar?')) {
      return;
    }

    try {
      await dbService.clearAllData();
      setConversations([]);
      setMessages([]);
      setSelectedConversationId(null);
      alert('✅ Dados limpos com sucesso! Clique em "Sincronizar" para buscar as conversas novamente.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Erro ao limpar dados');
    }
  };

  return (
    <div className="bg-background-dark text-white font-display overflow-hidden h-screen flex w-full">
      <Sidebar activeTab="chat" onLogout={onLogout} user={user} />

      {/* Conversations List */}
      <aside className="w-80 md:w-96 flex flex-col border-r border-border-dark bg-background-dark flex-shrink-0">
        <div className="flex flex-col gap-4 p-4 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Atendimentos</h2>
            <button className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-full transition-colors" title="Nova Conversa">
              <span className="material-symbols-outlined text-xl">edit_square</span>
            </button>
          </div>
          <label className="flex flex-col w-full h-11">
            <div className="flex w-full flex-1 items-stretch rounded-full h-full bg-surface-dark border border-transparent focus-within:border-primary/50 transition-colors">
              <div className="text-text-muted flex items-center justify-center pl-4 pr-2">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="flex w-full min-w-0 flex-1 bg-transparent text-white focus:outline-none placeholder:text-text-muted text-sm font-medium"
                placeholder="Buscar contatos..."
              />
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 px-4 py-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors disabled:opacity-50"
            title="Sincronizar mensagens do WhatsApp"
          >
            <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>
              {syncing ? 'progress_activity' : 'sync'}
            </span>
            <span className="text-sm font-medium">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
            title="Limpar todos os dados e remover conversas duplicadas"
          >
            <span className="material-symbols-outlined text-lg">delete_sweep</span>
            <span className="text-sm font-medium">Limpar</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark rounded-full border border-border-dark">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-primary">Online</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-dark overflow-x-auto">
            {/* Type filters */}
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterType === 'all' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('groups')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterType === 'groups' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Grupos
            </button>
            <button
              onClick={() => setFilterType('individual')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterType === 'individual' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Individuais
            </button>

            {/* Status filters */}
            <div className="w-px h-6 bg-border-dark mx-2"></div>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterStatus === 'all' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('unread')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterStatus === 'unread' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Não Lidas
            </button>
            <button
              onClick={() => setFilterStatus('read')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterStatus === 'read' ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-muted hover:bg-surface-light'
                }`}
            >
              Lidas
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-muted">
              <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
              <p>Nenhuma conversa ainda</p>
            </div>
          ) : (
            conversations
              .filter(conv => {
                // Filter by type
                if (filterType === 'groups' && !conv.contact?.is_group) return false;
                if (filterType === 'individual' && conv.contact?.is_group) return false;

                // Filter by status
                if (filterStatus === 'unread' && (!conv.unread_count || conv.unread_count === 0)) return false;
                if (filterStatus === 'read' && conv.unread_count && conv.unread_count > 0) return false;

                return true;
              })
              .map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`cursor-pointer flex items-center gap-4 px-4 py-4 transition-colors group border-l-4 ${selectedConversationId === conv.id
                    ? 'bg-surface-hover border-primary'
                    : 'border-transparent hover:bg-surface-hover/50'
                    }`}
                >
                  <div className="relative">
                    {conv.contact?.avatar_url ? (
                      <img
                        alt={conv.contact?.name}
                        className="size-12 rounded-full object-cover"
                        src={conv.contact?.avatar_url}
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center text-text-muted text-lg font-bold">
                        {conv.contact?.name.charAt(0)}
                      </div>
                    )}
                    {conv.status === 'open' && (
                      <span className="absolute bottom-0 right-0 size-3 bg-primary border-2 border-background-dark rounded-full"></span>
                    )}
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-bold line-clamp-1">{conv.contact?.name}</p>
                        {conv.contact?.is_group && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/30">
                            Grupo
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-bold ${conv.unread_count ? 'text-primary' : 'text-text-muted'}`}>
                        {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </p>
                    </div>
                    <p className={`text-sm line-clamp-1 ${conv.unread_count ? 'text-white font-semibold' : 'text-text-muted'}`}>
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread_count && (
                    <div className="shrink-0 flex items-center justify-center size-5 rounded-full bg-primary text-[#0c1808] text-[10px] font-bold">
                      {conv.unread_count}
                    </div>
                  )
                  }
                </div>
              ))
          )}
        </div>
      </aside >

      {/* Main Chat View */}
      < main className="flex-1 flex flex-col relative min-w-0 bg-[#0c120a]" >
        {
          selectedConv ? (
            <>
              <header className="h-18 px-6 py-3 flex items-center justify-between border-b border-border-dark bg-background-dark/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {selectedConv.contact?.avatar_url ? (
                      <img
                        alt={selectedConv.contact?.name}
                        className="size-10 rounded-full object-cover"
                        src={selectedConv.contact?.avatar_url}
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-surface-dark flex items-center justify-center text-text-muted font-bold">
                        {selectedConv.contact?.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 size-2.5 bg-primary border-2 border-background-dark rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedConv.contact?.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary font-medium">Online</span>
                      <span className="text-text-muted text-[10px]">•</span>
                      <span className="text-xs text-text-muted">Ticket #{selectedConv.id.split('_')[1]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-text-muted hover:text-white hover:bg-surface-hover rounded-full transition-colors">
                    <span className="material-symbols-outlined">search</span>
                  </button>
                  <button className="p-2 text-text-muted hover:text-white hover:bg-surface-hover rounded-full transition-colors" title="Transferir Ticket">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                  <button className="p-2 text-text-muted hover:text-white hover:bg-surface-hover rounded-full transition-colors" title="Resolver Ticket">
                    <span className="material-symbols-outlined text-primary">task_alt</span>
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                <div className="absolute inset-0 bg-chat-pattern pointer-events-none z-0"></div>

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
                    <p className="text-text-muted text-sm italic">Inicie a conversa enviando uma mensagem abaixo.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center relative z-10">
                      <span className="bg-surface-dark text-text-muted text-xs font-medium px-3 py-1 rounded-full border border-border-dark">Hoje</span>
                    </div>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col gap-1 relative z-10 group ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`message-bubble shadow-sm ${msg.sender === 'user' ? 'message-sent' : 'message-received'}`}>
                          <p>{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 ${msg.sender === 'user' ? 'mr-2' : 'ml-2'}`}>
                          <span className="text-[10px] text-text-muted">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.sender === 'user' && (
                            <span className="material-symbols-outlined text-[14px] text-primary">done_all</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-background-dark border-t border-border-dark z-20">
                <div className="flex items-end gap-3 bg-surface-dark p-2 rounded-[1.5rem] border border-transparent focus-within:border-primary/30 transition-colors">
                  <button className="p-2 text-text-muted hover:text-white rounded-full hover:bg-surface-hover shrink-0 transition-colors">
                    <span className="material-symbols-outlined">mood</span>
                  </button>
                  <button className="p-2 text-text-muted hover:text-white rounded-full hover:bg-surface-hover shrink-0 transition-colors">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <textarea
                    className="w-full bg-transparent border-0 text-white placeholder:text-text-muted focus:ring-0 resize-none py-2.5 max-h-32 min-h-[24px]"
                    placeholder="Digite sua mensagem..."
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  ></textarea>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || sending}
                    className="p-2.5 bg-primary hover:bg-primary/90 text-background-dark rounded-full transition-all shadow-lg hover:shadow-primary/20 shrink-0 mb-0.5 disabled:opacity-50 disabled:shadow-none"
                  >
                    {sending ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined filled">send</span>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 shadow-[0_0_30px_rgba(76,223,32,0.1)]">
                <span className="material-symbols-outlined text-4xl filled">chat_bubble</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Pronto para atender</h3>
              <p className="text-text-muted max-w-xs mt-3 leading-relaxed">Selecione uma conversa na lista lateral para visualizar o histórico e responder mensagens em tempo real.</p>
            </div>
          )}
      </main >
    </div >
  );
};

export default ChatPage;
