
interface AIAssistantProps {
  selectedConversation: {
    id: string;
    contact_name: string;
    phone_number: string;
  } | null;
  onSendMessage?: (content: string) => Promise<void>;
}

export function AIAssistant({ selectedConversation, onSendMessage }: AIAssistantProps) {
  if (!selectedConversation) {
    return (
      <aside className="flex h-full w-full max-w-sm flex-col border-l border-gray-200 dark:border-gray-800 bg-background-light dark:bg-background-dark p-6">
        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-center">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">smart_toy</span>
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm mt-2">Para ver a análise da IA</p>
        </div>
      </aside>
    );
  }

  // Análise básica baseada nas mensagens (pode ser expandida com IA real)
  const sentiment = 'Positivo'; // Placeholder - pode ser calculado com análise de sentimento
  const nextStep = 'Perguntar se restou alguma dúvida.'; // Placeholder
  const leadClassification = 'Quente'; // Placeholder
  const tags = ['Plano Pro', 'Follow-up']; // Placeholder
  const origin = 'Campanha Google Ads'; // Placeholder

  const suggestedResponses = [
    'Confirmar agendamento',
    'Enviar link do produto',
    'Perguntar sobre o orçamento',
  ];

  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-l border-gray-200 dark:border-gray-800 bg-background-light dark:bg-background-dark p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assistente de IA</h3>
      <div className="mt-6 flex flex-col gap-6 overflow-y-auto">
        {/* Classificação do Lead */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            Classificação do Lead
          </p>
          <span className="inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/40 px-3 py-1 text-sm font-bold text-red-600 dark:text-red-400">
            {leadClassification}
          </span>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                  index === 0
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1">
            Origem
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{origin}</p>
        </div>

        {/* Análise da IA */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Análise da IA
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-lg text-gray-500 dark:text-gray-400 mt-0.5">
                sentiment_satisfied
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sentimento</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{sentiment}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-lg text-gray-500 dark:text-gray-400 mt-0.5">
                next_plan
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Próximo Passo Recomendado
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{nextStep}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sugestões de Resposta */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Sugestões de Resposta
          </p>
          <div className="flex flex-col gap-2">
            {suggestedResponses.map((response, index) => (
              <button
                key={index}
                onClick={() => onSendMessage?.(response)}
                className={`w-full rounded-lg border p-2.5 text-sm font-medium text-left transition-colors ${
                  index === 0
                    ? 'border-primary/50 bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {response}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-green-500">
              <span className="material-symbols-outlined">thumb_up</span>
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500">
              <span className="material-symbols-outlined">thumb_down</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

