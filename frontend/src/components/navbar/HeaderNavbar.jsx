import React, { useState, useEffect } from 'react';
import { Sun, Moon, Save, Play, Key, X, Check } from 'lucide-react';
import { saveWorkflow, runWorkflowExecution, serializeWorkflowGraph, getGeminiApiKey, setGeminiApiKey, validateTemplateVariables } from '../../services/api';

export default function HeaderNavbar({
  workflowName,
  setWorkflowName,
  nodes,
  edges,
  theme,
  toggleTheme,
  onStartExecution,
  onWorkflowExecuted,
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySavedAlert, setKeySavedAlert] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setApiKey(getGeminiApiKey());
  }, []);

  const handleSaveKey = () => {
    setGeminiApiKey(apiKey);
    setKeySavedAlert(true);
    setTimeout(() => {
      setKeySavedAlert(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const handleClearKey = () => {
    setApiKey('');
    setGeminiApiKey('');
  };

  const handleSave = async () => {
    const data = serializeWorkflowGraph(workflowName, nodes, edges);
    await saveWorkflow(data);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleRun = async () => {
    if (onStartExecution) {
      onStartExecution();
    }
    const res = await runWorkflowExecution('wf_dev', {}, nodes);
    if (onWorkflowExecuted) {
      onWorkflowExecuted(res, nodes);
    }
  };

  const isKeySet = Boolean(apiKey.trim());

  return (
    <header
      style={{
        height: '50px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>FlowForge AI</span>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Personal Gemini API Key Button */}
        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          title="Configure Personal Gemini API Key"
          style={{
            background: isKeySet ? '#10b98115' : 'var(--bg-main)',
            border: `1px solid ${isKeySet ? '#10b981' : 'var(--border-color)'}`,
            color: isKeySet ? '#10b981' : 'var(--text-main)',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 500,
          }}
        >
          <Key size={14} />
          <span>Gemini Key</span>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isKeySet ? '#10b981' : '#f59e0b',
              display: 'inline-block',
            }}
          />
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={14} />
              <span>Light Mode</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSave}
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {saveToast ? <Check size={14} color="#10b981" /> : <Save size={14} />}
          <span>{saveToast ? 'Saved!' : 'Save Workflow'}</span>
        </button>

        <button
          type="button"
          onClick={handleRun}
          style={{
            background: 'var(--primary)',
            border: 'none',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Play size={14} fill="#ffffff" />
          <span>Run Workflow</span>
        </button>
      </div>

      {/* Gemini Key Modal Dialog */}
      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowKeyModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '400px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Personal Gemini API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
              Add your personal Google Gemini API key to execute AI workflows. Each user can supply their own key; no shared or fixed key required.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '0 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              {isKeySet ? (
                <button
                  type="button"
                  onClick={handleClearKey}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Clear Key
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  style={{
                    background: 'var(--primary)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {keySavedAlert ? <Check size={14} /> : null}
                  <span>{keySavedAlert ? 'Saved!' : 'Save Key'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

