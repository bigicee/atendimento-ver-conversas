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
      const formattedNumber = phoneNumber.includes('@')
        ? phoneNumber
        : `${phoneNumber}@s.whatsapp.net`;

      const response = await fetch(
        `${this.baseUrl}/message/sendText/${instance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.key?.id || data.messageId,
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
