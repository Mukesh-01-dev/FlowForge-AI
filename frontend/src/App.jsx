import React, { useState, useEffect } from 'react';
import HeaderNavbar from './components/navbar/HeaderNavbar';
import NodePalette from './components/sidebar/NodePalette';
import WorkflowCanvas from './components/canvas/WorkflowCanvas';
import NodeInspector from './components/inspector/NodeInspector';
import { useWorkflowCanvas } from './hooks/useWorkflowCanvas';
import './styles/theme.css';

export default function App() {
  const [workflowName, setWorkflowName] = useState('workflow');
  const [theme, setTheme] = useState('light'); // Light mode by default

  const [activeTab, setActiveTab] = useState('params');

  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeClick,
    onReconnect,
    onNodeClick,
    onPaneClick,
    updateNodeParams,
    setWorkflowRunning,
    updateExecutionResults,
    addNode,
    deleteNode,
  } = useWorkflowCanvas();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleStartExecution = () => {
    setWorkflowRunning();
    setActiveTab('output');
  };

  const handleWorkflowExecuted = (res, currentNodes) => {
    updateExecutionResults(res, currentNodes);
    setActiveTab('output');
  };

  return (
    <div className="app-container">
      <HeaderNavbar
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        nodes={nodes}
        edges={edges}
        theme={theme}
        toggleTheme={toggleTheme}
        onStartExecution={handleStartExecution}
        onWorkflowExecuted={handleWorkflowExecuted}
      />
      <div className="workspace">
        <NodePalette onAddNode={addNode} />
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onReconnect={onReconnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
        />
        <NodeInspector
          selectedNode={selectedNode}
          updateNodeParams={updateNodeParams}
          deleteNode={deleteNode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
}
