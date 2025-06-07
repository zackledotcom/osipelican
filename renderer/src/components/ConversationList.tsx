import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { Conversation } from '@/types';

export function ConversationList() {
  console.log('[DEBUG] ConversationList mounting');
  const {
    conversations,
    currentConversation,
    loadConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
  } = useConversations();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createConversation(newTitle.trim());
    setNewTitle('');
    setIsCreating(false);
  };

  const handleEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateConversationTitle(id, editTitle.trim());
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white/90">Conversations</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group relative rounded-lg p-2 transition-all duration-200
              ${
                currentConversation?.id === conversation.id
                  ? 'bg-blue-500/20 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/80'
              }
              backdrop-blur-sm border border-white/10
              animate-in slide-in duration-200`}
          >
            {editingId === conversation.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md
                    text-white placeholder-white/50
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                    transition-all"
                  autoFocus
                />
                <button
                  onClick={() => handleEdit(conversation.id)}
                  className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadConversation(conversation.id)}
                  className="flex-1 text-left truncate"
                >
                  <span className="font-medium">{conversation.title}</span>
                  <span className="block text-xs text-white/50">
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(conversation.id);
                      setEditTitle(conversation.title);
                    }}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(conversation.id)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        {isCreating ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New conversation title..."
              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md
                text-white placeholder-white/50
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                transition-all"
              autoFocus
            />
            <button 
              onClick={handleCreate} 
              className="px-4 py-1.5 bg-blue-500/20 text-white rounded-md
                hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                border border-white/10 transition-all"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-1.5 bg-white/10 text-white/80 rounded-md
                hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50
                border border-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-4 py-2 bg-blue-500/20 text-white rounded-md
              hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50
              border border-white/10 transition-all
              flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        )}
      </div>
    </div>
  );
} 