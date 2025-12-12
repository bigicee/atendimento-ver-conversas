import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
  throw new Error(
    'VITE_SUPABASE_URL não está configurado. Por favor, configure no arquivo .env'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY não está configurado. Por favor, configure no arquivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message_id_external: string | null;
  content: string;
  sender_type: 'contact' | 'agent';
  sender_name: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  media_url: string | null;
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata: Record<string, unknown>;
  created_at: string;
}
