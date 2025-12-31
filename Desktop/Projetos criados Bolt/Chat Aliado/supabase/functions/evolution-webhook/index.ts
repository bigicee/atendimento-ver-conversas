import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let webhookLogId: string | null = null

    try {
        const payload = await req.json()
        console.log('📥 Received webhook:', JSON.stringify(payload, null, 2))

        // Evolution API sends different event types
        const event = payload.event
        const data = payload.data

        if (event === 'messages.upsert') {
            // Extract message data
            const message = data.message || data
            const key = message.key || {}
            const messageContent = message.message || {}

            // Get remoteJid (this is the unique conversation ID)
            const remoteJid = key.remoteJid || ''
            const pushName = message.pushName || ''
            const isGroup = remoteJid.includes('@g.us')

            // Extract phone number - USE senderPn for accurate phone number
            // remoteJid can be LID format (225099319910513@lid) which is NOT the phone number
            let phone = ''

            // Try to get phone from senderPn first (most reliable for LID messages)
            if (key.senderPn) {
                phone = key.senderPn.replace('@s.whatsapp.net', '').replace('@lid', '').replace('@g.us', '')
            } else if (isGroup) {
                phone = remoteJid.replace('@g.us', '')
            } else {
                // Fallback: extract from remoteJid (works for old format @s.whatsapp.net)
                phone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '')
            }


            // Get message text and type
            let content = ''
            let messageType = 'text'
            let mediaUrl = null

            if (messageContent.conversation) {
                content = messageContent.conversation
            } else if (messageContent.extendedTextMessage) {
                content = messageContent.extendedTextMessage.text
            } else if (messageContent.imageMessage) {
                content = messageContent.imageMessage.caption || 'Imagem'
                messageType = 'image'
                mediaUrl = messageContent.imageMessage.url || null
            } else if (messageContent.videoMessage) {
                content = messageContent.videoMessage.caption || 'Vídeo'
                messageType = 'video'
                mediaUrl = messageContent.videoMessage.url || null
            } else if (messageContent.documentMessage) {
                content = messageContent.documentMessage.fileName || 'Documento'
                messageType = 'document'
                mediaUrl = messageContent.documentMessage.url || null
            } else if (messageContent.audioMessage) {
                content = 'Áudio'
                messageType = 'audio'
                mediaUrl = messageContent.audioMessage.url || null
            } else {
                content = 'Mensagem de mídia'
            }

            // Extract message timestamp
            const messageTimestamp = message.messageTimestamp
            const messageDate = messageTimestamp
                ? new Date(messageTimestamp * 1000).toISOString()
                : new Date().toISOString()

            // Determine if message is from user or contact
            const fromMe = key.fromMe || false
            const sender = fromMe ? 'user' : 'contact'

            console.log('📋 Extracted data:', {
                remoteJid,
                phone,
                content: content.substring(0, 50),
                sender,
                pushName,
                isGroup,
                messageType,
                messageTimestamp,
                messageDate
            })

            // Create initial webhook log
            const { data: logData, error: logError } = await supabase
                .from('webhook_logs')
                .insert({
                    event_type: event,
                    raw_payload: payload,
                    remote_jid: remoteJid,
                    phone: phone,
                    is_group: isGroup,
                    push_name: pushName,
                    from_me: fromMe,
                    processing_status: 'pending'
                })
                .select()
                .single()

            if (logError) {
                console.error('❌ Error creating webhook log:', logError)
            } else {
                webhookLogId = logData.id
                console.log('✅ Webhook log created:', webhookLogId)
            }

            // Find or create contact
            let contactId: string | null = null
            const accountId = 'default' // TODO: Get from instance or config

            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('phone', phone)
                .single()

            if (existingContact) {
                contactId = existingContact.id
                console.log('👤 Found existing contact:', contactId)
            } else {
                const { data: newContact, error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                        name: pushName || phone,
                        phone: phone,
                        account_id: accountId
                    })
                    .select()
                    .single()

                if (contactError) {
                    throw new Error(`Failed to create contact: ${contactError.message}`)
                }

                contactId = newContact.id
                console.log('✨ Created new contact:', contactId)
            }

            // Find or create conversation
            let conversationId: string | null = null

            const { data: existingConversation } = await supabase
                .from('conversations')
                .select('id, unread_count')
                .eq('contact_id', contactId)
                .single()

            if (existingConversation) {
                conversationId = existingConversation.id
                console.log('💬 Found existing conversation:', conversationId)

                // Update conversation with new message
                const newUnreadCount = fromMe ? 0 : (existingConversation.unread_count || 0) + 1

                const { error: updateError } = await supabase
                    .from('conversations')
                    .update({
                        last_message: content.substring(0, 100),
                        last_message_at: messageDate,
                        unread_count: newUnreadCount
                    })
                    .eq('id', conversationId)

                if (updateError) {
                    console.error('⚠️ Error updating conversation:', updateError)
                } else {
                    console.log('📝 Updated conversation, unread_count:', newUnreadCount)
                }
            } else {
                const { data: newConversation, error: conversationError } = await supabase
                    .from('conversations')
                    .insert({
                        contact_id: contactId,
                        status: 'open',
                        last_message: content.substring(0, 100),
                        last_message_at: messageDate,
                        unread_count: fromMe ? 0 : 1
                    })
                    .select()
                    .single()

                if (conversationError) {
                    throw new Error(`Failed to create conversation: ${conversationError.message}`)
                }

                conversationId = newConversation.id
                console.log('✨ Created new conversation:', conversationId)
            }

            // Save message
            const { data: messageData, error: messageError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender: sender,
                    content: content,
                    type: messageType,
                    media_url: mediaUrl,
                    created_at: messageDate
                })
                .select()
                .single()

            if (messageError) {
                throw new Error(`Failed to save message: ${messageError.message}`)
            }

            console.log('💾 Message saved:', messageData.id)

            // Update webhook log with success
            if (webhookLogId) {
                await supabase
                    .from('webhook_logs')
                    .update({
                        contact_id: contactId,
                        conversation_id: conversationId,
                        processing_status: 'success'
                    })
                    .eq('id', webhookLogId)

                console.log('✅ Webhook log updated with success')
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    contact_id: contactId,
                    conversation_id: conversationId,
                    message_id: messageData.id
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                }
            )
        }

        // For other event types, just log
        console.log('ℹ️ Unhandled event type:', event)
        return new Response(
            JSON.stringify({ success: true, message: 'Event logged but not processed' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('❌ Error processing webhook:', error)

        // Update webhook log with error
        if (webhookLogId) {
            await supabase
                .from('webhook_logs')
                .update({
                    processing_status: 'error',
                    error_message: error.message
                })
                .eq('id', webhookLogId)
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
