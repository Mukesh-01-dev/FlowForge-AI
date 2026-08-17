import React, { useState, useEffect } from 'react';
import { Copy, Check, Sliders, Terminal, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { STARTER_NODES } from '../../constants/nodeRegistry';
import { getGeminiApiKey, setGeminiApiKey, validateTemplateVariables } from '../../services/api';

function renderHighlightedTemplate(templateStr) {
  if (!templateStr) return null;
  // Matches {{input}}, {{question}}, or any {{variable}} or {variable}
  const parts = templateStr.split(/(\{\{[^{}]+\}\}|\{[^{}]+\})/g);

  return parts.map((part, index) => {
    if (/^(\{\{[^{}]+\}\}|\{[^{}]+\})$/.test(part)) {
      return (
        <span
          key={index}
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--primary, #6366f1)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontWeight: 600,
            fontFamily: 'monospace',
            fontSize: '11px',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            margin: '0 2px',
            display: 'inline-block',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

function StatusBadge({ status }) {
  if (status === 'running') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#6366f115',
          border: '1px solid #6366f1',
          color: '#6366f1',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <Clock size={11} className="spin" />
        Running...
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#10b98115',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <CheckCircle2 size={11} />
        Completed
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#ef444415',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <AlertCircle size={11} />
        Error
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      Not Executed Yet
    </span>
  );
}

export default function NodeInspector({
  selectedNode,
  updateNodeParams,
  deleteNode,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) {
  const [localActiveTab, setLocalActiveTab] = useState('params');
  const activeTab = propActiveTab !== undefined ? propActiveTab : localActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setLocalActiveTab;

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySavedMsg, setKeySavedMsg] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  useEffect(() => {
    setApiKeyInput(getGeminiApiKey());
  }, []);

  if (!selectedNode) {
    return (
      <div
        style={{
          width: '280px',
          height: '100%',
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border-color)',
          padding: '16px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        Select a node to view properties
      </div>
    );
  }

  const nodeType = selectedNode.type || 'input';
  const nodeDef = STARTER_NODES[nodeType] || STARTER_NODES.input;
  const params = selectedNode.data?.params || selectedNode.params || {};

  // LLM node options
  const modelOptionsMap = nodeDef.modelOptions || STARTER_NODES.llm.modelOptions || {};
  const currentProvider = params.provider || selectedNode.params?.provider || nodeDef.defaultParams?.provider || 'gemini';
  const modelOptions = modelOptionsMap[currentProvider] || [];
  const currentModel = params.model || selectedNode.params?.model || modelOptions[0] || 'gemini-flash-lite-latest';

  // Per-node execution data
  const executionStatus = selectedNode.data?.executionStatus || 'idle';
  const outputContent = selectedNode.data?.output;
  const errorContent = selectedNode.data?.error;

  const handleCopyRaw = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)',
      }}
    >
      {/* Node Header */}
      <div style={{ padding: '16px 16px 12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: nodeDef.color }}>
          {selectedNode.data?.label || nodeDef.label}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Type: {nodeType} | ID: {selectedNode.id}
        </div>
      </div>

      {/* Tab Switcher: Parameters | Run Output */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('params')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeTab === 'params' ? 'var(--bg-main)' : 'transparent',
            color: activeTab === 'params' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'params' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sliders size={13} />
          <span>Parameters</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('output')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeTab === 'output' ? 'var(--bg-main)' : 'transparent',
            color: activeTab === 'output' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'output' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Terminal size={13} />
          <span>Run Output</span>
        </button>
      </div>

      {/* Drawer Body Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {activeTab === 'params' ? (
          <>
            {/* Node Label */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Node Label
              </label>
              <input
                type="text"
                value={selectedNode.data?.label || ''}
                onChange={(e) => updateNodeParams(selectedNode.id, { ...params, label: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            {/* LLM Node Parameters */}
            {nodeType === 'llm' && (
              <>
                {/* Provider Dropdown */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Provider
                  </label>
                  <select
                    value={currentProvider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      const newModels = modelOptionsMap[newProvider] || [];
                      updateNodeParams(selectedNode.id, {
                        ...params,
                        provider: newProvider,
                        model: newModels[0] || '',
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {Object.keys(modelOptionsMap).map((provKey) => (
                      <option key={provKey} value={provKey}>
                        {provKey.charAt(0).toUpperCase() + provKey.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Dropdown reading options from modelOptions[selectedNode.params.provider] */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Model
                  </label>
                  <select
                    value={currentModel}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {modelOptions.map((modelName) => (
                      <option key={modelName} value={modelName}>
                        {modelName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature Slider */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                      Temperature
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>
                      {params.temperature ?? 0.7}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={params.temperature ?? 0.7}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Max Tokens Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="32768"
                    step="1"
                    value={params.max_tokens ?? params.maxTokens ?? 2048}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, max_tokens: parseInt(e.target.value, 10) || 2048 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Personal Gemini API Key Option */}
                <div style={{ marginBottom: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Personal Gemini API Key
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter personal Gemini Key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        borderRadius: '6px',
                        padding: '0 8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setGeminiApiKey(apiKeyInput);
                        setKeySavedMsg(true);
                        setTimeout(() => setKeySavedMsg(false), 2000);
                      }}
                      style={{
                        flex: 1,
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {keySavedMsg ? 'Saved!' : 'Save Key'}
                    </button>
                    {apiKeyInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setApiKeyInput('');
                          setGeminiApiKey('');
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Input Node Parameters */}
            {nodeType === 'input' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Input Query
                </label>
                <textarea
                  rows={3}
                  value={params.query || ''}
                  onChange={(e) => updateNodeParams(selectedNode.id, { ...params, query: e.target.value })}
                  placeholder="Enter prompt query..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {/* Prompt Node / Prompt Template Parameters */}
            {(nodeType === 'prompt' || nodeType === 'promptTemplate') && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Prompt Template
                </label>
                <textarea
                  rows={5}
                  value={params.template || ''}
                  onChange={(e) => updateNodeParams(selectedNode.id, { ...params, template: e.target.value })}
                  placeholder="Context: {{input}}\nQuestion: {{question}}"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />

                {/* Template Variable Validation Warning */}
                {validateTemplateVariables(params.template || '').length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      background: '#f59e0b15',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      color: '#f59e0b',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    ⚠️ <strong>Template Warning:</strong> Unknown variable(s){' '}
                    <code>{validateTemplateVariables(params.template || '').map((v) => `{{${v}}}`).join(', ')}</code>.
                    Expected variables: <code>{"{{input}}"}</code>, <code>{"{{question}}"}</code>.
                  </div>
                )}

                {/* Read-only Live Template Preview */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: 'var(--text-muted)' }}>
                    Live Template Preview
                  </label>
                  <div
                    style={{
                      padding: '10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      lineHeight: '1.6',
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {renderHighlightedTemplate(params.template || '')}
                  </div>
                </div>
              </div>
            )}

            {/* Document Loader Parameters */}
            {nodeType === 'documentLoader' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  File Path
                </label>
                <input
                  type="text"
                  value={params.filePath || ''}
                  onChange={(e) => updateNodeParams(selectedNode.id, { ...params, filePath: e.target.value })}
                  placeholder="Path to PDF..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Text Splitter Parameters */}
            {nodeType === 'textSplitter' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Chunk Size
                  </label>
                  <input
                    type="number"
                    value={params.chunk_size ?? 1000}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, chunk_size: parseInt(e.target.value, 10) || 1000 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Chunk Overlap
                  </label>
                  <input
                    type="number"
                    value={params.chunk_overlap ?? 200}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, chunk_overlap: parseInt(e.target.value, 10) || 200 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </>
            )}

            {/* Embedding Parameters */}
            {nodeType === 'embedding' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Provider
                  </label>
                  <input
                    type="text"
                    value={params.provider || 'gemini'}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, provider: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={params.model || 'models/text-embedding-004'}
                    onChange={(e) => updateNodeParams(selectedNode.id, { ...params, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </>
            )}

            {/* Vector DB Parameters */}
            {nodeType === 'vectorDb' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Collection Name
                </label>
                <input
                  type="text"
                  value={params.collection_name || 'default_collection'}
                  onChange={(e) => updateNodeParams(selectedNode.id, { ...params, collection_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Retriever Parameters */}
            {nodeType === 'retriever' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Top K
                </label>
                <input
                  type="number"
                  value={params.top_k ?? 4}
                  onChange={(e) => updateNodeParams(selectedNode.id, { ...params, top_k: parseInt(e.target.value, 10) || 4 })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </>
        ) : (
          /* Run Output Panel Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Status Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Execution Status
              </span>
              <StatusBadge status={executionStatus} />
            </div>

            {/* Running Spinner */}
            {executionStatus === 'running' && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--primary)', fontSize: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Clock size={24} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 600 }}>Executing Node...</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Processing input stream and model inference.</div>
              </div>
            )}

            {/* Error Message Display */}
            {executionStatus === 'error' && (
              <div style={{ padding: '12px', background: '#ef444415', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>Execution Failure</span>
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {errorContent || outputContent || 'An unexpected error occurred during node execution.'}
                </div>
              </div>
            )}

            {/* Completed Output Display */}
            {executionStatus === 'completed' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Output Content
                  </span>
                  {outputContent && (
                    <button
                      type="button"
                      onClick={() => handleCopyRaw(outputContent)}
                      title="Copy raw output string to clipboard"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {copiedRaw ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedRaw ? 'Copied!' : 'Copy Raw Output'}</span>
                    </button>
                  )}
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: 'var(--text-main)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    fontFamily: nodeType === 'output' ? 'inherit' : 'monospace',
                  }}
                >
                  {outputContent || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No output produced by this node.</span>}
                </div>
              </div>
            )}

            {/* Not Executed State */}
            {executionStatus === 'idle' && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <Terminal size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Not Executed Yet</div>
                <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                  Click <strong>Run Workflow</strong> in the top navigation bar to execute nodes and view results.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Node Button Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => deleteNode(selectedNode.id)}
          style={{
            width: '100%',
            background: '#ef444415',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}


