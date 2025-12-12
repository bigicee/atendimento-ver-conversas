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
      const url = `${this.baseUrl}/message/sendText/${encodedInstance}`;

      const requestBody = {
        number: formattedNumber,
        text: message,
      };

      console.log('Sending message via Evolution API:', {
        url,
        number: formattedNumber,
        message: message.substring(0, 50) + '...',
        instance: encodedInstance,
        apiKeyLength: this.apiKey.length,
      });

      // Tentar diferentes formatos de autenticação sequencialmente
      const authMethods: Array<{
        name: string;
        url?: string;
        headers: Record<string, string>;
      }> = [
        // Método 1: Header 'apikey' (mais comum)
        {
          name: 'apikey header',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
        },
        // Método 2: Header 'Authorization: Bearer'
        {
          name: 'Authorization Bearer',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
        // Método 3: Header 'X-API-Key'
        {
          name: 'X-API-Key header',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        },
        // Método 4: Query parameter
        {
          name: 'query parameter',
          url: `${url}?apikey=${encodeURIComponent(this.apiKey)}`,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ];

      let lastError: Error | null = null;

      for (const method of authMethods) {
        try {
          const requestUrl = method.url || url;
          console.log(`Trying authentication method: ${method.name}`);

          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: method.headers,
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          console.log(`Response (${method.name}):`, response.status, responseText.substring(0, 200));

          if (response.ok) {
            const data = JSON.parse(responseText);
            console.log(`✓ Success with method: ${method.name}`);
            return {
              success: true,
              messageId: data.key?.id || data.messageId || data.id,
            };
          }

          // Se não for 401, pode ser outro erro válido
          if (response.status !== 401) {
            let errorData;
            try {
              errorData = JSON.parse(responseText);
            } catch {
              errorData = { message: responseText || 'Failed to send message' };
            }
            throw new Error(errorData.message || errorData.error || 'Failed to send message');
          }

          // Se for 401, tentar próximo método
          lastError = new Error(`Unauthorized with ${method.name}`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('Unauthorized')) {
            lastError = error;
            continue; // Tentar próximo método
          }
          // Se não for erro de autenticação, propagar
          throw error;
        }
      }

      // Se todos os métodos falharam
      throw lastError || new Error('All authentication methods failed');
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
