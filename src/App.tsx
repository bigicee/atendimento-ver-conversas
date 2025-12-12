import { useEffect, useState } from 'react';
import { supabase, Conversation, Message } from './lib/supabase';
import { ConversationList } from './components/ConversationList';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { MessageCircle } from 'lucide-react';
import { evolutionApi } from './services/evolutionApi';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  useEffect(() => {
    loadConversations();
    setupRealtimeSubscriptions();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      markAsRead(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === payload.new.id ? (payload.new as Conversation) : conv
              ).sort((a, b) =>
                new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations((prev) => prev.filter((conv) => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.conversation_id === selectedConversationId) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      let messageStatus: 'sent' | 'failed' = 'sent';

      if (evolutionApi.isConfigured()) {
        const result = await evolutionApi.sendTextMessage({
          phoneNumber: selectedConversation.phone_number,
          message: content,
        });

        if (!result.success) {
          console.warn('Failed to send via Evolution API:', result.error);
          messageStatus = 'failed';
        }
      }

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        content,
        sender_type: 'agent',
        sender_name: 'Atendente',
        message_type: 'text',
        status: messageStatus,
      });

      if (messageError) throw messageError;

      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* SideNavBar */}
      <aside className="flex h-full w-20 flex-col items-center bg-white dark:bg-gray-900/30 border-r border-gray-200 dark:border-gray-800 py-4">
        <div className="flex flex-col items-center gap-8">
          <div className="bg-gradient-to-br from-primary to-blue-600 aspect-square rounded-full size-10 flex items-center justify-center text-white font-bold">
            <span className="text-lg">CA</span>
          </div>
          <nav className="flex flex-col gap-4">
            <a className="flex items-center justify-center p-3 rounded-lg bg-primary/20 text-primary" href="#" title="Caixa de Entrada">
              <span className="material-symbols-outlined">inbox</span>
            </a>
            <a className="flex items-center justify-center p-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" href="#" title="Contatos">
              <span className="material-symbols-outlined">group</span>
            </a>
            <a className="flex items-center justify-center p-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" href="#" title="Relatórios">
              <span className="material-symbols-outlined">bar_chart</span>
            </a>
            <a className="flex items-center justify-center p-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" href="#" title="IA">
              <span className="material-symbols-outlined">smart_toy</span>
            </a>
            <a className="flex items-center justify-center p-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" href="#" title="Configurações">
              <span className="material-symbols-outlined">settings</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Conversations List Column */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />

      {/* Main Chat Panel */}
      <main className="flex h-full flex-1 flex-col bg-gray-100/50 dark:bg-background-dark/50">
        {selectedConversation ? (
          <>
            <header className="flex h-[73px] items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-primary to-blue-600 aspect-square rounded-full size-10 flex items-center justify-center text-white font-semibold">
                  {selectedConversation.contact_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                    {selectedConversation.contact_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversation.phone_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="material-symbols-outlined">search</span>
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </header>

            <MessageList
              messages={messages}
              contactName={selectedConversation.contact_name}
            />

            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm mt-2">
                Escolha uma conversa na lista para começar
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
