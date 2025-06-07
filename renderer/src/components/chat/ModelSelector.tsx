import React, { useEffect, useState } from 'react';
import { useChatStore, OllamaModel } from '../../state/chatStore';
import { Download, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ModelSelector() {
  const { availableModels, currentModel, modelPullProgress, loadModels, setModel, pullModel } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleModelChange = async (modelName: string) => {
    setSelectedModel(modelName);
    await setModel(modelName);
  };

  const handlePullModel = async (modelName: string) => {
    setIsLoading(true);
    try {
      await pullModel(modelName);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="p-4 border-b border-white/10">
      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold mb-4"
      >
        Model Selection
      </motion.h3>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {availableModels.map((model, index) => (
          <motion.div
            key={model.name}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <div className="flex items-center space-x-2">
              <motion.input
                whileTap={{ scale: 0.95 }}
                type="radio"
                id={model.name}
                name="model"
                checked={selectedModel === model.name}
                onChange={() => handleModelChange(model.name)}
                className="w-4 h-4 text-blue-500"
              />
              <label htmlFor={model.name} className="flex-1">
                <motion.div
                  whileHover={{ x: 5 }}
                  className="font-medium"
                >
                  {model.name}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="text-sm text-white/60"
                >
                  {model.details.parameter_size} • {model.details.quantization_level}
                </motion.div>
              </label>
            </div>
            <AnimatePresence mode="wait">
              {modelPullProgress > 0 && model.name === selectedModel ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm"
                  >
                    {Math.round(modelPullProgress * 100)}%
                  </motion.span>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePullModel(model.name)}
                  disabled={isLoading}
                  className="p-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
} 