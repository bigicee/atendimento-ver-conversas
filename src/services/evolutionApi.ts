interface SendMessageParams {
  phoneNumber: string;
  message: string;
  instanceName?: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_EVOLUTION_API_URL || '';
    this.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
    this.instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '';
  }

  async sendTextMessage({
    phoneNumber,
    message,
    instanceName,
  }: SendMessageParams): Promise<SendMessageResponse> {
    const instance = instanceName || this.instanceName;

    if (!this.baseUrl || !this.apiKey || !instance) {
      console.warn(
        'Evolution API not configured. Add VITE_EVOLUTION_API_URL, VITE_EVOLUTION_API_KEY, and VITE_EVOLUTION_INSTANCE_NAME to .env'
      );
      return {
        success: false,
        error: 'Evolution API not configured',
      };
    }

    try {
      // Formatar número: remover caracteres especiais e garantir formato correto
      let formattedNumber = phoneNumber.replace(/[^\d]/g, ''); // Remove tudo exceto dígitos
      
      // Se não começar com código do país, assumir Brasil (55)
      if (!formattedNumber.startsWith('55') && formattedNumber.length === 11) {
        formattedNumber = '55' + formattedNumber;
      }
      
      // Adicionar sufixo do WhatsApp se não tiver
      if (!formattedNumber.includes('@')) {
        formattedNumber = `${formattedNumber}@s.whatsapp.net`;
      }

      // Codificar o nome da instância para URL (pode ter caracteres especiais)
      const encodedInstance = encodeURIComponent(instance);

      // Evolution API pode usar diferentes formatos de autenticação
      // Tentar múltiplos formatos comuns
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Adicionar autenticação - tentar diferentes formatos
      if (this.apiKey) {
        // Formato mais comum: Authorization Bearer
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        // Também adicionar como apikey (algumas versões usam isso)
        headers['apikey'] = this.apiKey;
        // E como X-API-Key (outro formato comum)
        headers['X-API-Key'] = this.apiKey;
      }

      // Construir URL - algumas versões da Evolution API podem precisar da API key na query string
      const url = `${this.baseUrl}/message/sendText/${encodedInstance}`;
      const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(this.apiKey)}`;

      console.log('Sending message via Evolution API:', {
        url,
        urlWithKey,
        number: formattedNumber,
        message: message.substring(0, 50) + '...',
        instance: encodedInstance,
        hasApiKey: !!this.apiKey,
      });

      // Tentar primeiro com headers
      let response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: formattedNumber,
          text: message,
        }),
      });

      // Se der 401, tentar com API key na query string
      if (response.status === 401) {
        console.log('401 Unauthorized with headers, trying with query parameter...');
        response = await fetch(urlWithKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: message,
          }),
        });
      }

      const responseText = await response.text();
      console.log('Evolution API response:', response.status, responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Failed to send message' };
        }
        throw new Error(errorData.message || errorData.error || 'Failed to send message');
      }

      const data = JSON.parse(responseText);

      return {
        success: true,
        messageId: data.key?.id || data.messageId || data.id,
      };
    } catch (error) {
      console.error('Error sending message via Evolution API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendMediaMessage({
    phoneNumber,
    mediaUrl,
    caption,
    instanceName,
  }: {
    phoneNumber: string;
    mediaUrl: string;
    caption?: string;
    instanceName?: string;
  }): Promise<SendMessageResponse> {
    const instance = instanceName || this.instanceName;

    if (!this.baseUrl || !this.apiKey || !instance) {
      return {
        success: false,
        error: 'Evolution API not configured',
      };
    }

    try {
      const formattedNumber = phoneNumber.includes('@')
        ? phoneNumber
        : `${phoneNumber}@s.whatsapp.net`;

      const response = await fetch(
        `${this.baseUrl}/message/sendMedia/${instance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            number: formattedNumber,
            mediaUrl,
            caption,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send media');
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.key?.id || data.messageId,
      };
    } catch (error) {
      console.error('Error sending media via Evolution API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey && this.instanceName);
  }
}

export const evolutionApi = new EvolutionApiService();
