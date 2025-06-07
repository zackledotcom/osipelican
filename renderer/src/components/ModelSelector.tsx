import React, { useEffect } from 'react';
import { useModelStore } from '../state/modelStore';

export const ModelSelector: React.FC = () => {
  const { models, current, loading, error, load, set } = useModelStore();

  useEffect(() => {
    load();
  }, [load]);

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelName = event.target.value;
    if (modelName) {
      await set(modelName);
    }
  };

  return (
    <div className="model-selector">
      <select
        value={current || ''}
        onChange={handleModelChange}
        disabled={loading}
        className="model-select"
      >
        <option value="">Select a model</option>
        {models.map((model) => (
          <option key={model.name} value={model.name}>
            {model.name}
          </option>
        ))}
      </select>
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}; 