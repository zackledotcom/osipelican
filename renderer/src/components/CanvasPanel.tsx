import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Link, Unlink } from 'lucide-react';
import { useChatMessageStore } from '../../state/chatMessageStore';
import { ipcRenderer } from 'electron';

interface MemoryNodeProps {
  id: string;
  title: string;
  model: string;
  onDelete?: () => void;
  onLink?: () => void;
  isLinked?: boolean;
  linkedMessageId?: string;
}

function MemoryNode({ id, title, model, onDelete, onLink, isLinked, linkedMessageId }: MemoryNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group bg-white/10 border border-white/10 rounded-lg shadow-sm 
        px-4 py-3 text-sm text-white backdrop-blur hover:shadow-md transition-all duration-200"
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-slate-300">{model}</div>
      {linkedMessageId && (
        <div className="text-xs text-blue-400 mt-1">Linked to message</div>
      )}
      
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLink}
          className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title={isLinked ? "Unlink from message" : "Link to message"}
        >
          {isLinked ? <Unlink className="w-3 h-3" /> : <Link className="w-3 h-3" />}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Delete memory node"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function CanvasPanel() {
  const [nodes, setNodes] = useState([
    { id: '1', title: 'Agent Signals', model: 'phi4-mini-reasoning', isLinked: true, linkedMessageId: 'msg-1' },
    { id: '2', title: 'Startup Routines', model: 'wizardcoder-7b-python', isLinked: false },
    { id: '3', title: 'Tools Index', model: 'deepseek-coder-1.3b', isLinked: false },
  ]);

  const { metadata, linkMemory } = useChatMessageStore();

  // Sync linked messages with memory nodes
  useEffect(() => {
    const linkedMessages = Object.entries(metadata)
      .filter(([_, meta]) => meta.linkedMemoryId)
      .map(([messageId, meta]) => ({
        messageId,
        memoryId: meta.linkedMemoryId!
      }));

    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        isLinked: linkedMessages.some(link => link.memoryId === node.id),
        linkedMessageId: linkedMessages.find(link => link.memoryId === node.id)?.messageId
      }))
    );
  }, [metadata]);

  const handleAddNode = async () => {
    try {
      const newId = (nodes.length + 1).toString();
      const newNode = {
        id: newId,
        title: `New Memory ${newId}`,
        model: 'default-model',
        isLinked: false
      };

      await ipcRenderer.invoke('memory:create', newNode);
      setNodes([...nodes, newNode]);
    } catch (error) {
      console.error('Failed to create memory node:', error);
    }
  };

  const handleDeleteNode = async (id: string) => {
    try {
      await ipcRenderer.invoke('memory:delete', { id });
      setNodes(nodes.filter(node => node.id !== id));
    } catch (error) {
      console.error('Failed to delete memory node:', error);
    }
  };

  const handleToggleLink = async (id: string) => {
    try {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      if (node.isLinked && node.linkedMessageId) {
        // Unlink from message
        await linkMemory(node.linkedMessageId, '');
      } else {
        // Show message selection dialog
        const result = await ipcRenderer.invoke('memory:select-message');
        if (result?.messageId) {
          await linkMemory(result.messageId, id);
        }
      }
    } catch (error) {
      console.error('Failed to toggle memory link:', error);
    }
  };

  return (
    <div className="w-full h-96 bg-gradient-to-br from-blue-900/30 to-slate-800/30 
      border border-white/10 rounded-xl shadow-inner p-4 text-white space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Visual Memory Map</h2>
        <button
          onClick={handleAddNode}
          className="p-2 rounded-md bg-white/10 hover:bg-white/20 
            text-white/70 hover:text-white transition-colors"
          title="Add new memory node"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence>
          {nodes.map((node) => (
            <MemoryNode
              key={node.id}
              id={node.id}
              title={node.title}
              model={node.model}
              onDelete={() => handleDeleteNode(node.id)}
              onLink={() => handleToggleLink(node.id)}
              isLinked={node.isLinked}
              linkedMessageId={node.linkedMessageId}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
} 