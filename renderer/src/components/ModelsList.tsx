import React, { useEffect, useState } from 'react';
import type { OllamaModel } from '@shared/types/ollama';

export const ModelsList: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const response = await window.electron.ipc.invoke('ollama:list-models', undefined);
        setModels(response);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError('Failed to load models. Please check if Ollama is running.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Available Models</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Available Models</h2>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Available Models</h2>
      {models.length === 0 ? (
        <p className="text-gray-500">No models available</p>
      ) : (
        <ul className="space-y-2">
          {models.map((model) => (
            <li
              key={model.name}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div>
                <span className="font-medium">{model.name}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({model.details.parameter_size})
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {model.details.format} / {model.details.quantization_level}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 