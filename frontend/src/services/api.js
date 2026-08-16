/**
 * API Service Layer for FlowForge AI
 * Handles workflow persistence, graph serialization, execution dispatching, and status polling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Validates template string variables using regex /\{\{(\w+)\}\}/g
 * Returns list of unknown variable names outside ['input', 'question']
 */
export const validateTemplateVariables = (templateStr) => {
  if (!templateStr) return [];
  const allowedVars = ['input', 'question'];
  const regex = /\{\{(\w+)\}\}/g;
  const unknownVars = new Set();
  let match;
  while ((match = regex.exec(templateStr)) !== null) {
    const varName = match[1];
    if (!allowedVars.includes(varName)) {
      unknownVars.add(varName);
    }
  }
  return Array.from(unknownVars);
};

/**
 * Transforms ReactFlow nodes & edges into FlowForge DAG JSON schema
 */
export const serializeWorkflowGraph = (name, nodes, edges) => {
  return {
    name: name || 'Untitled AI Workflow',
    description: 'Visual DAG workflow definition created via FlowForge UI',
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data?.label || node.id,
      position: node.position,
      parameters: node.data?.params || {},
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    })),
  };
};

/**
 * Save workflow definition to FastAPI backend
 */
export const saveWorkflow = async (workflowData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('[API Service] Backend API un-reachable. Using local fallback mode:', error.message);
    // Offline fallback for smooth dev workflow
    return {
      id: `wf_${Date.now()}`,
      status: 'saved_locally',
      timestamp: new Date().toISOString(),
      ...workflowData,
    };
  }
};

/**
 * Manage Personal Gemini API Key in browser storage
 */
export const getGeminiApiKey = () => {
  return localStorage.getItem('flowforge_gemini_api_key') || localStorage.getItem('gemini_api_key') || '';
};

export const setGeminiApiKey = (key) => {
  if (key) {
    localStorage.setItem('flowforge_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('flowforge_gemini_api_key');
    localStorage.removeItem('gemini_api_key');
  }
};

/**
 * Trigger async workflow execution (calls Gemini API with prompt interpolation)
 */
export const runWorkflowExecution = async (workflowId, inputParams = {}, nodes = []) => {
  const userApiKey = getGeminiApiKey();

  // Extract Input Node query
  const inputNode = nodes.find((n) => n.type === 'input');
  const userQuery = inputParams.query || inputNode?.data?.params?.query || 'what is today\'s date?';

  // Extract Prompt Template node
  const promptNode = nodes.find((n) => n.type === 'prompt' || n.type === 'promptTemplate');
  const templateStr = promptNode?.data?.params?.template || '';

  // Interpolate prompt string
  let finalPrompt = userQuery;
  if (templateStr) {
    finalPrompt = templateStr
      .replace(/\{\{input\}\}/g, userQuery)
      .replace(/\{\{question\}\}/g, userQuery)
      .replace(/\{query\}/g, userQuery);
  }

  // Extract LLM node settings
  const llmNode = nodes.find((n) => n.type === 'llm');
  const modelName = llmNode?.data?.params?.model || 'gemini-flash-lite-latest';
  const nodeApiKey = llmNode?.data?.params?.apiKey;
  const effectiveApiKey = nodeApiKey || userApiKey;

  const startTime = Date.now();

  // Try calling backend API first
  try {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveApiKey ? { 'X-Gemini-API-Key': effectiveApiKey } : {}),
      },
      body: JSON.stringify({
        inputs: {
          ...inputParams,
          prompt: finalPrompt,
          gemini_api_key: effectiveApiKey,
        },
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('[API Service] Backend API unreachable, executing directly via Gemini API:', error.message);
  }

  // If user provided a Gemini API Key, execute real Google Gemini API call
  if (effectiveApiKey) {
    const candidateModels = Array.from(new Set([modelName, 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-flash-latest']));
    let lastErrorMsg = '';

    for (const targetModel of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${effectiveApiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const generatedText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'No text response generated by Gemini model.';

          return {
            run_id: `run_${Date.now()}`,
            status: 'completed',
            output: {
              result: generatedText,
              execution_time_ms: Date.now() - startTime,
            },
          };
        } else {
          const errorData = await res.json();
          lastErrorMsg = `Gemini API Error (${res.status}): ${errorData?.error?.message || 'Invalid API key or model request.'}`;
          if (res.status === 404) {
            console.warn(`[API Service] Model ${targetModel} returned 404, trying fallback model...`);
            continue;
          }
          break;
        }
      } catch (err) {
        lastErrorMsg = `Failed to connect to Gemini API: ${err.message}`;
      }
    }

    return {
      run_id: `run_${Date.now()}`,
      status: 'error',
      output: {
        result: lastErrorMsg,
        execution_time_ms: Date.now() - startTime,
      },
    };
  }

  // Fallback prompt if no API Key is provided
  return {
    run_id: `run_${Date.now()}`,
    status: 'completed',
    output: {
      result: `[Demo Mode]: Please add your personal Gemini API Key in the top bar ("Gemini Key") to get real AI answers for: "${userQuery}".`,
      execution_time_ms: Date.now() - startTime,
    },
  };
};

/**
 * Check Backend Health
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
};
