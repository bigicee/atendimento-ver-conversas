# Central de Atendimento WhatsApp

Sistema completo de central de atendimento para WhatsApp usando Evolution API.

## Funcionalidades

- Recebimento de mensagens via webhook da Evolution API
- Armazenamento de conversas e mensagens no banco de dados
- Interface tipo WhatsApp (lista de conversas + área de mensagens)
- Atualizações em tempo real usando Supabase Realtime
- Estrutura pronta para envio de mensagens via Evolution API
- Contador de mensagens não lidas
- Suporte para diferentes tipos de mídia (imagem, vídeo, áudio, documento)

## Tecnologias

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (banco de dados + realtime + edge functions)
- Evolution API (WhatsApp não oficial)
- Lucide React (ícones)

## Estrutura do Banco de Dados

### Tabela `conversations`
- Armazena informações de cada conversa/contato
- Campos: phone_number, contact_name, last_message, last_message_at, unread_count

### Tabela `messages`
- Armazena todas as mensagens enviadas e recebidas
- Campos: conversation_id, content, sender_type, message_type, media_url, status, metadata

## Configuração

### 1. Webhook da Evolution API

A URL do webhook já está disponível através da Edge Function:

```
https://sua-url-supabase.supabase.co/functions/v1/whatsapp-webhook
```

Configure este webhook na Evolution API para receber mensagens.

### 2. Envio de Mensagens (Opcional)

Para habilitar o envio de mensagens de volta via Evolution API, adicione as seguintes variáveis no arquivo `.env`:

```env
VITE_EVOLUTION_API_URL=https://sua-evolution-api.com
VITE_EVOLUTION_API_KEY=sua-api-key
VITE_EVOLUTION_INSTANCE_NAME=nome-da-instancia
```

**Nota:** O envio de mensagens funciona mesmo sem essas configurações, mas as mensagens não serão enviadas para o WhatsApp (apenas salvas no banco).

## Como Usar

1. Configure o webhook na Evolution API apontando para a URL da Edge Function
2. Quando uma mensagem chegar no WhatsApp, ela aparecerá automaticamente na interface
3. Clique em uma conversa na lista à esquerda para ver as mensagens
4. Digite e envie mensagens usando o campo de texto na parte inferior
5. As mensagens são atualizadas em tempo real para todos os usuários conectados

## Estrutura de Arquivos

```
src/
├── components/
│   ├── ConversationList.tsx   # Lista de conversas na sidebar
│   ├── MessageList.tsx         # Área de exibição de mensagens
│   └── MessageInput.tsx        # Input para enviar mensagens
├── lib/
│   └── supabase.ts            # Cliente Supabase + tipos
├── services/
│   └── evolutionApi.ts        # Serviço para envio via Evolution API
└── App.tsx                    # Componente principal
```

## Webhook da Evolution API

O webhook espera dados no seguinte formato:

```json
{
  "event": "messages.upsert",
  "instance": "nome_da_instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "message_id"
    },
    "message": {
      "conversation": "Texto da mensagem"
    },
    "messageTimestamp": "1234567890",
    "pushName": "Nome do Contato"
  }
}
```

O sistema processa automaticamente:
- Mensagens de texto
- Imagens (com caption)
- Vídeos (com caption)
- Áudios
- Documentos (com caption)

## Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Políticas configuradas (atualmente permissivas para desenvolvimento)
- Edge Function sem verificação JWT (para receber webhooks externos)

## Próximos Passos

- Implementar autenticação de agentes
- Adicionar tags e categorias para conversas
- Implementar busca de conversas e mensagens
- Adicionar suporte para mensagens de mídia no envio
- Implementar templates de mensagens rápidas
- Adicionar métricas e relatórios
