import { ChatMessage, Conversation } from '../types/chat';
export declare class MessageStore {
    private db;
    private encryptionKey;
    constructor();
    initialize(): Promise<void>;
    private getOrCreateKey;
    private generateId;
    createConversation(title: string, metadata?: Record<string, any>): Promise<string>;
    saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
    getConversation(id: string): Promise<ChatMessage[]>;
    listConversations(): Promise<Conversation[]>;
    deleteConversation(id: string): Promise<void>;
    updateConversationTitle(id: string, title: string): Promise<void>;
    private encrypt;
    private decrypt;
}
