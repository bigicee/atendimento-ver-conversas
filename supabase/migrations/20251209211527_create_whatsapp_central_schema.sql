/*
  # WhatsApp Central de Atendimento - Schema Inicial

  ## Descrição
  Cria a estrutura de banco de dados para uma central de atendimento WhatsApp
  que recebe mensagens via Evolution API webhook.

  ## Novas Tabelas

  ### conversations
  Armazena informações sobre cada conversa/contato
  - `id` (uuid, primary key) - Identificador único da conversa
  - `phone_number` (text, unique) - Número do contato (formato internacional)
  - `contact_name` (text) - Nome do contato
  - `last_message` (text) - Última mensagem enviada/recebida
  - `last_message_at` (timestamptz) - Data/hora da última mensagem
  - `unread_count` (integer) - Contador de mensagens não lidas
  - `created_at` (timestamptz) - Data de criação da conversa

  ### messages
  Armazena todas as mensagens recebidas e enviadas
  - `id` (uuid, primary key) - Identificador único da mensagem
  - `conversation_id` (uuid, foreign key) - Referência à conversa
  - `message_id_external` (text) - ID da mensagem na Evolution API
  - `content` (text) - Conteúdo da mensagem
  - `sender_type` (text) - Tipo do remetente: 'contact' ou 'agent'
  - `sender_name` (text) - Nome de quem enviou
  - `message_type` (text) - Tipo: 'text', 'image', 'audio', 'video', 'document'
  - `media_url` (text) - URL da mídia (se houver)
  - `status` (text) - Status: 'received', 'sent', 'delivered', 'read', 'failed'
  - `metadata` (jsonb) - Dados adicionais da Evolution API
  - `created_at` (timestamptz) - Data/hora de criação

  ## Segurança
  - RLS habilitado em ambas as tabelas
  - Políticas para acesso autenticado (preparado para futura autenticação de agentes)
  - Por ora, políticas permissivas para desenvolvimento

  ## Índices
  - Índice na coluna phone_number para busca rápida
  - Índice na coluna conversation_id para joins eficientes
  - Índice em created_at para ordenação temporal
*/

-- Criar tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  contact_name text DEFAULT '',
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id_external text,
  content text DEFAULT '',
  sender_type text NOT NULL CHECK (sender_type IN ('contact', 'agent')),
  sender_name text DEFAULT '',
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  media_url text,
  status text DEFAULT 'received' CHECK (status IN ('received', 'sent', 'delivered', 'read', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(message_id_external);

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversations (permissivas para desenvolvimento, restringir depois com auth)
CREATE POLICY "Allow public read access to conversations"
  ON conversations FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to conversations"
  ON conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Políticas para messages
CREATE POLICY "Allow public read access to messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to messages"
  ON messages FOR UPDATE
  USING (true)
  WITH CHECK (true);