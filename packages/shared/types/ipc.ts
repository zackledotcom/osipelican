// Canonical shared types for IPC and Electron API

import type { ChatMessage, ChatResponse, Conversation, Role } from './chat';
import type { AppStatus, Document, Vector } from './app';
import type { OllamaModel, ModelLoadingState, OllamaConnectionStatus, OllamaRequestOptions } from './ollama';

export interface IpcMessageMap {
  'chat:send-message': {
    request: ChatMessage;
    response: ChatMessage;
  };
  'chat:send-message-stream': {
    request: ChatMessage;
    response: void;
  };
  'chat:create-conversation': {
    request: string;
    response: string;
  };
  'chat:get-conversation': {
    request: string;
    response: ChatMessage[];
  };
  'chat:get-conversations': {
    request: void;
    response: Conversation[];
  };
  'chat:delete-conversation': {
    request: string;
    response: void;
  };
  'chat:update-conversation-title': {
    request: { id: string; title: string };
    response: void;
  };
  'chat:message-received': {
    request: ChatMessage;
    response: void;
  };
  'app:health-check': {
    request: void;
    response: AppStatus;
  };
  'ollama:list-models': {
    request: void;
    response: { models: OllamaModel[] };
  };
  'ollama:set-model': {
    request: { modelName: string };
    response: void;
  };
  'ollama:check-connection': {
    request: void;
    response: OllamaConnectionStatus;
  };
  'ollama:cancel-load': {
    request: void;
    response: void;
  };
  'ollama:save-config': {
    request: { modelName: string; config: OllamaRequestOptions };
    response: void;
  };
  'ollama:model-loading-state-changed': {
    request: ModelLoadingState;
    response: void;
  };
  'vector:search': {
    request: string;
    response: Document[];
  };
  'vector:add': {
    request: Omit<Document, 'id'>;
    response: void;
  };
  'vector:delete': {
    request: string;
    response: void;
  };
  'vector:clear': {
    request: void;
    response: void;
  };
}

export interface ElectronAPI {
  ipc: {
    invoke: <K extends keyof IpcMessageMap>(
      channel: K,
      request: IpcMessageMap[K]['request']
    ) => Promise<IpcMessageMap[K]['response']>;
    on: <K extends string>(
      channel: K,
      callback: (...args: any[]) => void
    ) => () => void;
  };
}

export type { ChatMessage, ChatResponse, Conversation, Role } from './chat';
export type { AppStatus, Document, Vector } from './app';
export type { OllamaModel, ModelLoadingState, OllamaConnectionStatus, OllamaRequestOptions } from './ollama'; 