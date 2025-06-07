import type { ChatMessage, Conversation } from '../types/ipc';
export declare class ChatService {
    private static instance;
    private ollamaService;
    private vectorStoreService;
    private conversations;
    private constructor();
    static getInstance(): ChatService;
    initialize(): Promise<void>;
    sendMessage(message: ChatMessage): Promise<ChatMessage>;
    sendMessageStream(message: ChatMessage): Promise<void>;
    createConversation(title: string): Promise<string>;
    getConversation(id: string): Promise<ChatMessage[]>;
    listConversations(): Promise<Conversation[]>;
    deleteConversation(id: string): Promise<void>;
    updateConversationTitle(id: string, title: string): Promise<void>;
}
