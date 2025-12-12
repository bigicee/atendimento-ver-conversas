import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EvolutionWebhookData {
  event: string;
  instance?: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
      senderPn?: string;
    };
    senderPn?: string;
    message?: {
      conversation?: string;
      imageMessage?: { caption?: string; url?: string };
      videoMessage?: { caption?: string; url?: string };
      audioMessage?: { url?: string };
      documentMessage?: { caption?: string; url?: string };
    };
    messageTimestamp?: string | number;
    pushName?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      const webhookData: EvolutionWebhookData = await req.json();
      
      console.log('Webhook received:', JSON.stringify(webhookData, null, 2));

      if (webhookData.event === 'messages.upsert' && webhookData.data) {
        const { key, message, messageTimestamp, pushName, senderPn } = webhookData.data;

        const senderPhone = senderPn || key.senderPn;
        const phoneNumber = senderPhone
          ? senderPhone.replace('@s.whatsapp.net', '').replace('@lid', '')
          : key.remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

        const messageId = key.id;
        const isFromMe = key.fromMe;
        
        let messageContent = '';
        let messageType = 'text';
        let mediaUrl = '';

        if (message) {
          if (message.conversation) {
            messageContent = message.conversation;
            messageType = 'text';
          } else if (message.imageMessage) {
            messageContent = message.imageMessage.caption || '[Imagem]';
            messageType = 'image';
            mediaUrl = message.imageMessage.url || '';
          } else if (message.videoMessage) {
            messageContent = message.videoMessage.caption || '[Vídeo]';
            messageType = 'video';
            mediaUrl = message.videoMessage.url || '';
          } else if (message.audioMessage) {
            messageContent = '[Áudio]';
            messageType = 'audio';
            mediaUrl = message.audioMessage.url || '';
          } else if (message.documentMessage) {
            messageContent = message.documentMessage.caption || '[Documento]';
            messageType = 'document';
            mediaUrl = message.documentMessage.url || '';
          }
        }

        const contactName = pushName || phoneNumber;
        const senderType = isFromMe ? 'agent' : 'contact';

        const { data: existingConversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        let conversationId: string;

        if (existingConversation) {
          conversationId = existingConversation.id;
          
          const updateData: Record<string, unknown> = {
            last_message: messageContent,
            last_message_at: new Date().toISOString(),
          };

          if (contactName && contactName !== phoneNumber) {
            updateData.contact_name = contactName;
          }

          if (!isFromMe) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('unread_count')
              .eq('id', conversationId)
              .single();
            
            updateData.unread_count = (conv?.unread_count || 0) + 1;
          }

          await supabase
            .from('conversations')
            .update(updateData)
            .eq('id', conversationId);
        } else {
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
              phone_number: phoneNumber,
              contact_name: contactName,
              last_message: messageContent,
              last_message_at: new Date().toISOString(),
              unread_count: isFromMe ? 0 : 1,
            })
            .select('id')
            .single();

          if (createError || !newConv) {
            throw new Error('Failed to create conversation');
          }

          conversationId = newConv.id;
        }

        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            message_id_external: messageId,
            content: messageContent,
            sender_type: senderType,
            sender_name: contactName,
            message_type: messageType,
            media_url: mediaUrl,
            status: 'received',
            metadata: webhookData.data,
            created_at: messageTimestamp 
              ? new Date(Number(messageTimestamp) * 1000).toISOString() 
              : new Date().toISOString(),
          });

        if (msgError) {
          console.error('Error saving message:', msgError);
          throw msgError;
        }

        return new Response(
          JSON.stringify({ success: true, conversationId, messageId, phoneNumber }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Event received but not processed' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});