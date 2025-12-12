import { useState, useEffect } from 'react';
import { supabase, Message } from '../lib/supabase';
import { evolutionApi } from '../services/evolutionApi';
import { Send, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function TestPanel() {
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    url: '',
    hasKey: false,
    instance: '',
    isConfigured: false,
  });

  useEffect(() => {
    // Carregar configuração da API
    const url = import.meta.env.VITE_EVOLUTION_API_URL || '';
    const key = import.meta.env.VITE_EVOLUTION_API_KEY || '';
    const instance = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '';

    setApiConfig({
      url,
      hasKey: !!key,
      instance,
      isConfigured: evolutionApi.isConfigured(),
    });

    // Carregar últimas mensagens
    loadRecentMessages();
  }, []);

  const loadRecentMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setRecentMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhoneNumber.trim() || !testMessage.trim()) {
      setSendResult({ success: false, message: 'Preencha o número e a mensagem' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await evolutionApi.sendTextMessage({
        phoneNumber: testPhoneNumber.trim(),
        message: testMessage.trim(),
      });

      if (result.success) {
        setSendResult({
          success: true,
          message: `Mensagem enviada com sucesso! ID: ${result.messageId || 'N/A'}`,
        });
        setTestMessage('');
      } else {
        setSendResult({
          success: false,
          message: `Erro ao enviar: ${result.error || 'Erro desconhecido'}`,
        });
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Painel de Teste - Evolution API
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Teste o envio de mensagens e visualize as últimas mensagens recebidas
        </p>
      </div>

      {/* Configuração da API */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Configuração da API
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">URL:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {apiConfig.url || 'Não configurado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">API Key:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {apiConfig.hasKey ? '✓ Configurado' : '✗ Não configurado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Instância:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {apiConfig.instance || 'Não configurado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
            {apiConfig.isConfigured ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                Configurado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                Não configurado
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Envio */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Testar Envio de Mensagem
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número do WhatsApp
              </label>
              <input
                type="text"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="5511999999999 ou 11999999999"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Formato: 5511999999999 (com código do país) ou 11999999999 (será adicionado 55)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Digite a mensagem de teste..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={handleTestSend}
              disabled={isSending || !apiConfig.isConfigured}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Mensagem de Teste
                </>
              )}
            </button>

            {sendResult && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  sendResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                {sendResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    sendResult.success
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {sendResult.message}
                </p>
              </div>
            )}

            {!apiConfig.isConfigured && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Configure a Evolution API no arquivo .env para testar o envio de mensagens.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Painel de Mensagens Recebidas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Últimas 20 Mensagens
            </h2>
            <button
              onClick={loadRecentMessages}
              disabled={isLoadingMessages}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`}
              />
              Atualizar
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            message.sender_type === 'agent'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          }`}
                        >
                          {message.sender_type === 'agent' ? 'Agente' : 'Contato'}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            message.message_type === 'text'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              : message.message_type === 'image'
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                              : message.message_type === 'video'
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : message.message_type === 'audio'
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                              : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                          }`}
                        >
                          {message.message_type}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            message.status === 'sent'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : message.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {message.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {message.sender_name || 'Sem nome'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {message.content || `[${message.message_type}]`}
                  </p>
                  {message.media_url && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      Media: {message.media_url.substring(0, 50)}...
                    </p>
                  )}
                  {message.message_id_external && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ID Externo: {message.message_id_external}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

