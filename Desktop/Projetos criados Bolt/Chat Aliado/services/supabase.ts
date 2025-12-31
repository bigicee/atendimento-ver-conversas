/**
 * Supabase Service
 * Placeholders for real Supabase integration as per technical handoff.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
 */

// In a real implementation, you would import { createClient } from '@supabase/supabase-js'
// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
// export const supabase = createClient(supabaseUrl, supabaseKey);

import { evolutionService } from './evolution';

// In-memory user store for mock implementation
let mockUsers = [
  {
    id: 'user-1',
    email: 'bahiangelo@hotmail.com',
    user_metadata: { role: 'admin', name: 'Admin User' },
    created_at: new Date().toISOString()
  },
  {
    id: 'user-2',
    email: 'bahiangelo@gmail.com',
    user_metadata: { role: 'admin', name: 'Admin User 2' },
    created_at: new Date().toISOString()
  }
];

// Mock database tables - starting empty, will populate with real WhatsApp messages
let mockContacts: any[] = [];
let mockConversations: any[] = [];
let mockMessages: any[] = [];

export const authService = {
  async signIn(email: string, psw: string) {
    // Simulated Supabase Auth Call
    console.log('Authenticating with Supabase...', email);
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.email === email);
        if (user) {
          resolve({
            user: user,
            error: null
          });
        } else {
          resolve({
            user: null,
            error: { message: 'Credenciais inválidas.' }
          });
        }
      }, 1000);
    });
  },
  async signUp(email: string, password: string, name: string) {
    // Simulated Supabase Sign Up Call
    console.log('Creating account with Supabase...', email, name);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Validate password strength
        if (password.length < 6) {
          resolve({
            user: null,
            error: { message: 'A senha deve ter pelo menos 6 caracteres.' }
          });
          return;
        }

        // Check if user already exists
        if (mockUsers.find(u => u.email === email)) {
          resolve({
            user: null,
            error: { message: 'Este email já está cadastrado.' }
          });
          return;
        }

        // Create new user
        const newUser = {
          id: 'user-' + Date.now(),
          email: email,
          user_metadata: { role: 'agent', name: name },
          created_at: new Date().toISOString()
        };
        mockUsers.push(newUser);

        resolve({
          user: newUser,
          error: null
        });
      }, 1000);
    });
  },
  async signOut() {
    console.log('Signing out...');
  }
};

// Utility function to normalize phone number from remoteJid
// This ensures consistent IDs regardless of format (@s.whatsapp.net, @lid, etc.)
function normalizePhoneFromRemoteJid(remoteJid: string): string {
  return remoteJid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace(/[^0-9]/g, ''); // Keep only digits
}

export const dbService = {
  async getConversations(accountId: string) {
    console.log('Fetching conversations for account:', accountId);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Join conversations with contacts
        const conversationsWithContacts = mockConversations.map(conv => {
          const contact = mockContacts.find(c => c.id === conv.contact_id);
          return {
            ...conv,
            contact: contact
          };
        });
        resolve(conversationsWithContacts);
      }, 300);
    });
  },

  async getMessages(conversationId: string) {
    console.log('Fetching messages for conversation:', conversationId);
    return new Promise((resolve) => {
      setTimeout(() => {
        const messages = mockMessages
          .filter(m => m.conversation_id === conversationId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(messages);
      }, 200);
    });
  },

  async sendMessage(conversationId: string, content: string, instanceName: string) {
    console.log('Sending message:', { conversationId, content, instanceName });

    try {
      // Import supabase and webhook logger
      const { supabase } = await import('./supabaseClient');
      const { logWebhookEvent } = await import('./webhookLogger');

      // Find conversation and contact from REAL database
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Conversation not found:', convError);
        return { error: 'Conversa não encontrada' };
      }

      const contact = conversation.contact;
      if (!contact) {
        console.error('Contact not found');
        return { error: 'Contato não encontrado' };
      }

      // contact.phone contains the remoteJid
      const remoteJid = contact.phone;
      console.log('Sending to remoteJid:', remoteJid);

      // Send via Evolution API
      const result = await evolutionService.sendTextMessage(instanceName, remoteJid, content);
      console.log('Evolution API result:', result);

      if (result.error) {
        // Log failed send to webhook_logs
        await logWebhookEvent({
          event_type: 'messages.send',
          raw_payload: { content, remoteJid, error: result.error, instanceName },
          remote_jid: remoteJid,
          phone: contact.phone,
          from_me: true,
          conversation_id: conversationId,
          contact_id: contact.id,
          processing_status: 'error',
          error_message: result.error
        });

        return { error: result.error };
      }

      // Save message to REAL database
      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content: content,
          type: 'text'
        })
        .select()
        .single();

      if (msgError) {
        console.error('Error saving message:', msgError);
        return { error: 'Erro ao salvar mensagem' };
      }

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
          unread_count: 0
        })
        .eq('id', conversationId);

      // Log successful send to webhook_logs
      await logWebhookEvent({
        event_type: 'messages.send',
        raw_payload: { content, remoteJid, result, instanceName },
        remote_jid: remoteJid,
        phone: contact.phone,
        from_me: true,
        conversation_id: conversationId,
        contact_id: contact.id,
        processing_status: 'success'
      });

      // Also update mock for compatibility
      const mockMessage = {
        id: newMessage.id,
        conversation_id: conversationId,
        sender: 'user',
        content: content,
        type: 'text',
        created_at: newMessage.created_at
      };
      mockMessages.push(mockMessage);

      // Update mock conversation
      const mockConv = mockConversations.find(c => c.id === conversationId);
      if (mockConv) {
        mockConv.last_message = content;
        mockConv.last_message_at = newMessage.created_at;
      }

      return { data: newMessage, error: null };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { error: 'Erro ao enviar mensagem' };
    }
  },

  async clearAllData() {
    console.log('🗑️ Clearing all mock data...');
    const prevCounts = {
      contacts: mockContacts.length,
      conversations: mockConversations.length,
      messages: mockMessages.length
    };

    mockContacts.length = 0;
    mockConversations.length = 0;
    mockMessages.length = 0;

    console.log(`✅ Data cleared: ${prevCounts.contacts} contacts, ${prevCounts.conversations} conversations, ${prevCounts.messages} messages`);
    return { success: true, cleared: prevCounts };
  },

  async markConversationAsRead(conversationId: string) {
    console.log('Marking conversation as read:', conversationId);
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.unread_count = 0;
      console.log('Conversation marked as read');
    }
    return { success: true };
  },

  async saveIncomingMessage(
    remoteJid: string,      // Unique conversation ID
    phone: string,          // Phone for display
    contactName: string,    // Contact name
    content: string,        // Message content
    accountId: string,      // Account ID
    isGroup: boolean = false,
    sender: 'user' | 'contact' = 'contact'  // Who sent the message
  ) {
    console.log('Saving message:', { remoteJid, phone, contactName, content, sender });

    return new Promise((resolve) => {
      // Find existing contact by remoteJid (unique conversation ID)
      let contact = mockContacts.find(c => c.phone === remoteJid && c.account_id === accountId);

      if (!contact) {
        // Create new contact
        contact = {
          id: `contact-${Date.now()}`,
          name: contactName,
          phone: remoteJid,  // Store remoteJid as unique ID
          account_id: accountId,
          avatar_url: '',
          is_group: isGroup,
          created_at: new Date().toISOString()
        };
        mockContacts.push(contact);
        console.log('Created new contact:', contact.id, remoteJid);
      } else {
        console.log('Found existing contact:', contact.id, remoteJid);
        // Update contact name if changed
        if (contactName && contactName !== remoteJid) {
          contact.name = contactName;
        }
      }

      // Find existing conversation for this contact
      let conversation = mockConversations.find(c => c.contact_id === contact!.id);

      if (!conversation) {
        // Create new conversation
        conversation = {
          id: `conv_${Date.now()}`,
          contact_id: contact.id,
          status: 'open',
          assigned_to: null,
          last_message: content,
          last_message_at: new Date().toISOString(),
          unread_count: sender === 'contact' ? 1 : 0,  // Only count if from contact
          created_at: new Date().toISOString()
        };
        mockConversations.push(conversation);
        console.log('Created new conversation:', conversation.id);
      } else {
        // Update existing conversation
        conversation.last_message = content;
        conversation.last_message_at = new Date().toISOString();
        if (sender === 'contact') {
          conversation.unread_count = (conversation.unread_count || 0) + 1;
        }
        console.log('Updated existing conversation:', conversation.id);
      }

      // Save message with correct sender
      const message = {
        id: `msg_${Date.now()}`,
        conversation_id: conversation.id,
        sender: sender,  // 'user' or 'contact'
        content: content,
        type: 'text',
        created_at: new Date().toISOString()
      };
      mockMessages.push(message);

      resolve({ data: message, error: null });
    });
  },

  async saveConversationWithMessages(
    remoteJid: string,
    phone: string,
    contactName: string,
    accountId: string,
    isGroup: boolean,
    messages: any[]
  ) {
    console.log(`Saving conversation with ${messages.length} messages:`, { remoteJid, contactName });

    return new Promise((resolve) => {
      // Generate consistent ID from normalized phone number
      const normalizedPhone = normalizePhoneFromRemoteJid(remoteJid);
      const contactId = `contact_${normalizedPhone}`;

      // Find or create contact
      let contact = mockContacts.find(c => c.id === contactId);

      if (!contact) {
        contact = {
          id: contactId,
          name: contactName,
          phone: remoteJid,
          account_id: accountId,
          avatar_url: '',
          is_group: isGroup,
          created_at: new Date().toISOString()
        };
        mockContacts.push(contact);
        console.log('Created contact:', contact.id);
      } else {
        // Update contact name
        if (contactName && contactName !== remoteJid) {
          contact.name = contactName;
        }
        console.log('Updated existing contact:', contact.id);
      }

      // Generate consistent conversation ID from normalized phone
      const conversationId = `conv_${normalizedPhone}`;

      // Find or create conversation
      let conversation = mockConversations.find(c => c.id === conversationId);

      if (!conversation) {
        conversation = {
          id: conversationId,
          contact_id: contact.id,
          status: 'open',
          assigned_to: null,
          last_message: '',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          created_at: new Date().toISOString()
        };
        mockConversations.push(conversation);
        console.log('Created conversation:', conversation.id);
      } else {
        console.log('Updating existing conversation:', conversation.id);
      }

      // Clear existing messages for this conversation to avoid duplicates
      mockMessages = mockMessages.filter(m => m.conversation_id !== conversationId);

      // Process and save all messages
      let unreadCount = 0;
      let lastMessageText = '';
      let lastMessageTime = conversation.created_at;

      for (const msg of messages) {
        const key = msg.key || {};
        const fromMe = key.fromMe || false;
        const sender = fromMe ? 'user' : 'contact';

        // Extract message content
        const msgContent = msg.message || {};
        const content = msgContent.conversation ||
          msgContent.extendedTextMessage?.text ||
          msgContent.imageMessage?.caption ||
          msgContent.videoMessage?.caption ||
          'Mensagem de mídia';

        // Generate consistent message ID
        const messageId = `msg_${msg.id || Date.now()}_${Math.random()}`;

        // Save message
        const savedMessage = {
          id: messageId,
          conversation_id: conversationId,
          sender: sender,
          content: content,
          type: 'text',
          created_at: msg.messageTimestamp
            ? new Date(msg.messageTimestamp * 1000).toISOString()
            : new Date().toISOString()
        };

        // DEBUG: Log timestamp info
        if (!msg.messageTimestamp) {
          console.warn('⚠️ Message without timestamp, using current time:', {
            messageId,
            content: content.substring(0, 30)
          });
        }

        mockMessages.push(savedMessage);

        // Track last message and unread count
        if (!fromMe) {
          unreadCount++;
        }
        lastMessageText = content;
        lastMessageTime = savedMessage.created_at;
      }

      // Update conversation with last message info
      conversation.last_message = lastMessageText;
      conversation.last_message_at = lastMessageTime;
      conversation.unread_count = unreadCount;

      console.log(`Saved ${messages.length} messages, ${unreadCount} unread`);

      resolve({ success: true });
    });
  },

  // User Management
  async getAllUsers() {
    // In real implementation: supabase.from('profiles').select('*')
    console.log('Fetching all users...');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: mockUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.user_metadata.name,
            role: u.user_metadata.role,
            created_at: u.created_at
          })),
          error: null
        });
      }, 500);
    });
  },

  async createUser(email: string, password: string, name: string, role: 'admin' | 'agent') {
    // In real implementation: supabase.auth.admin.createUser() + insert into profiles
    console.log('Creating user...', email, role);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Validate
        if (password.length < 6) {
          resolve({
            data: null,
            error: { message: 'A senha deve ter pelo menos 6 caracteres.' }
          });
          return;
        }

        if (mockUsers.find(u => u.email === email)) {
          resolve({
            data: null,
            error: { message: 'Este email já está cadastrado.' }
          });
          return;
        }

        // Create user
        const newUser = {
          id: 'user-' + Date.now(),
          email: email,
          user_metadata: { role: role, name: name },
          created_at: new Date().toISOString()
        };
        mockUsers.push(newUser);

        resolve({
          data: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.user_metadata.name,
            role: newUser.user_metadata.role,
            created_at: newUser.created_at
          },
          error: null
        });
      }, 800);
    });
  },

  async updateUserRole(userId: string, newRole: 'admin' | 'agent') {
    // In real implementation: supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    console.log('Updating user role...', userId, newRole);
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
          user.user_metadata.role = newRole;
          resolve({
            data: {
              id: user.id,
              email: user.email,
              name: user.user_metadata.name,
              role: user.user_metadata.role,
              created_at: user.created_at
            },
            error: null
          });
        } else {
          resolve({
            data: null,
            error: { message: 'Usuário não encontrado.' }
          });
        }
      }, 500);
    });
  },

  async deleteUser(userId: string) {
    // In real implementation: supabase.auth.admin.deleteUser() + delete from profiles
    console.log('Deleting user...', userId);
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockUsers.findIndex(u => u.id === userId);
        if (index !== -1) {
          mockUsers.splice(index, 1);
          resolve({ error: null });
        } else {
          resolve({ error: { message: 'Usuário não encontrado.' } });
        }
      }, 500);
    });
  }
};
