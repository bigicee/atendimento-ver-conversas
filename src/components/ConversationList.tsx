import { Conversation } from '../lib/supabase';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return weekdays[date.getDay()];
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="flex h-full w-full max-w-sm flex-col border-r border-gray-200 dark:border-gray-800 bg-background-light dark:bg-background-dark">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caixa de Entrada</h1>
        <div className="mt-4">
          <label className="flex flex-col min-w-40 h-11 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-400 dark:text-gray-500 flex border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 items-center justify-center pl-4 rounded-l-lg">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-1 focus:ring-primary border border-l-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 pl-2 text-sm font-normal"
                placeholder="Buscar por nome ou mensagem"
                type="text"
              />
            </div>
          </label>
        </div>
        <div className="flex gap-2 p-3 -mx-3 overflow-x-auto mt-2">
          <div className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-full bg-primary text-white pl-4 pr-4">
            <p className="text-sm font-medium">Todos</p>
          </div>
          <div className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 pl-4 pr-4">
            <p className="text-sm font-medium">Não lido</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8 text-center">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">inbox</span>
            <p className="text-lg font-medium">Nenhuma conversa ainda</p>
            <p className="text-sm mt-2">As mensagens recebidas aparecerão aqui</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const isSelected = selectedConversationId === conversation.id;
            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`flex items-center gap-4 px-4 min-h-[72px] py-3 justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 dark:bg-primary/20 border-r-4 border-primary'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-primary to-blue-600 aspect-square rounded-full h-12 w-12 flex items-center justify-center text-white font-semibold">
                    {conversation.contact_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <p className="text-gray-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">
                      {conversation.contact_name || conversation.phone_number}
                    </p>
                    <p className={`text-sm font-medium leading-normal line-clamp-2 ${
                      isSelected
                        ? 'text-primary dark:text-primary/90'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {conversation.last_message || 'Nova conversa'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-normal">
                    {formatTime(conversation.last_message_at)}
                  </p>
                  {conversation.unread_count > 0 && (
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                      {conversation.unread_count}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
