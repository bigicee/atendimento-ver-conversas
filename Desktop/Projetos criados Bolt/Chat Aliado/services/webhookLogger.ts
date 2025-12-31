import { supabase } from './supabaseClient'

/**
 * Helper function to log webhook events
 * This can be used to log both incoming webhooks (from Evolution API)
 * and outgoing messages (sent via the system)
 */
export const logWebhookEvent = async (data: {
    event_type: string
    raw_payload: any
    remote_jid?: string | null
    phone?: string | null
    is_group?: boolean
    push_name?: string | null
    from_me?: boolean
    conversation_id?: string | null
    contact_id?: string | null
    processing_status?: 'pending' | 'success' | 'error'
    error_message?: string | null
}) => {
    try {
        const { error } = await supabase
            .from('webhook_logs')
            .insert({
                event_type: data.event_type,
                raw_payload: data.raw_payload,
                remote_jid: data.remote_jid || null,
                phone: data.phone || null,
                is_group: data.is_group || false,
                push_name: data.push_name || null,
                from_me: data.from_me || false,
                conversation_id: data.conversation_id || null,
                contact_id: data.contact_id || null,
                processing_status: data.processing_status || 'success',
                error_message: data.error_message || null
            })

        if (error) {
            console.error('Failed to log webhook event:', error)
            return { error }
        }

        return { success: true }
    } catch (error) {
        console.error('Error logging webhook event:', error)
        return { error }
    }
}
