import React, { useEffect, useState } from 'react';
import { useVectorStore } from '../state/vectorStore';

export const VectorManager = () => {
  const { vectors, stats, search, add, delete: remove, loadStats } = useVectorStore();
  const [query, setQuery] = useState('');
  const [newDoc, setNewDoc] = useState('');

  useEffect(() => {
    search('');
    loadStats();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Vector Memory</h2>

      <div className="flex items-center gap-2">
        <input
          className="input"
          placeholder="Search"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="btn" onClick={() => search(query)}>Search</button>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="input"
          placeholder="Add new memory"
          value={newDoc}
          onChange={e => setNewDoc(e.target.value)}
        />
        <button 
          className="btn" 
          onClick={() => {
            if (newDoc.trim()) {
              add({ id: Date.now().toString(), content: newDoc });
              setNewDoc('');
            }
          }}
        >
          Add
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Stats: {stats.count} vectors / {stats.dimensions} dims
      </div>

      <ul className="space-y-2">
        {vectors.map(v => (
          <li key={v.id} className="border p-2 rounded flex justify-between">
            <span>{v.content}</span>
            <button 
              className="btn-sm text-red-500" 
              onClick={() => remove(v.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}; 