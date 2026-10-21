import { useState, useRef, useCallback, useEffect } from 'react';
import { GraphNode, GraphEdge, GraphConfig, AlgorithmType, AlgorithmResult, AlgorithmStep, NodeState } from './types';
import GraphCanvas from './components/GraphCanvas';
import ControlPanel from './components/ControlPanel';
import TraversalLog from './components/TraversalLog';
import logoImage from './assets/logo.png';

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [config, setConfig] = useState<GraphConfig>({ directed: false, weighted: false });
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('bfs');
  const [startNode, setStartNode] = useState<string>('');
  const [endNode, setEndNode] = useState<string>('');
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [speed, setSpeed] = useState<number>(700);
  const [addingEdge, setAddingEdge] = useState<{ sourceId: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mode, setMode] = useState<'add-node' | 'add-edge' | 'select'>('add-node');
  
  // NEW: State to hold the raw text input
  const [graphText, setGraphText] = useState<string>('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nodeIdCounter = useRef(0);
  const edgeIdCounter = useRef(0);

  const getNodeStates = useCallback((): Record<string, NodeState> => {
    const states: Record<string, NodeState> = {};
    nodes.forEach(n => { states[n.id] = 'unvisited'; });

    if (startNode) states[startNode] = 'start';
    if (endNode) states[endNode] = 'end';

    if (result && currentStep >= 0) {
      const step = result.steps[currentStep];
      step.visited.forEach(id => {
        if (states[id] !== 'start' && states[id] !== 'end') states[id] = 'visited';
      });
      step.frontier.forEach(id => {
        if (states[id] !== 'start' && states[id] !== 'end' && states[id] !== 'visited') states[id] = 'frontier';
      });
      if (states[step.current] !== 'start' && states[step.current] !== 'end') {
        states[step.current] = 'current';
      }
      if (currentStep === result.steps.length - 1 && result.path.length > 0) {
        result.path.forEach(id => {
          if (states[id] !== 'start' && states[id] !== 'end') states[id] = 'path';
        });
      }
    }
    return states;
  }, [nodes, result, currentStep, startNode, endNode]);

  const getCurrentDistances = useCallback((): Record<string, number> => {
    if (result && currentStep >= 0 && algorithm === 'dijkstra') {
      return result.steps[currentStep].distances;
    }
    return {};
  }, [result, currentStep, algorithm]);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // NEW: Text Parser Logic
  const handleGraphTextChange = useCallback((text: string) => {
    setGraphText(text);

    // Split text by lines, ignore empty ones
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const uniqueNodeLabels = new Set<string>();
    const parsedEdges: { sourceLabel: string, targetLabel: string, weight: number }[] = [];

    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const u = parts[0];
        const v = parts[1];
        const w = parts.length > 2 ? parseFloat(parts[2]) : 1;
        uniqueNodeLabels.add(u);
        uniqueNodeLabels.add(v);
        parsedEdges.push({ sourceLabel: u, targetLabel: v, weight: isNaN(w) ? 1 : w });
      } else if (parts.length === 1) {
        uniqueNodeLabels.add(parts[0]);
      }
    });

    const nodesArray = Array.from(uniqueNodeLabels);
    const centerX = 400; // Approximate canvas center
    const centerY = 300;


  setNodes(prevNodes => {
      const updatedNodes: GraphNode[] = [];
      let newlyAddedCount = 0;
      
      nodesArray.forEach((label) => {
        const existingNode = prevNodes.find(n => n.label === label);
        if (existingNode) {
          updatedNodes.push(existingNode); // Preserve manual drag positions
        } else {
          // FIX: Use the total number of existing nodes + new nodes as the index.
          // This guarantees the spiral never resets to the center!
          const spawnIndex = prevNodes.length + newlyAddedCount;
          
          // Golden Spiral Layout
          const angle = spawnIndex * 137.5 * (Math.PI / 180);
          const r = 70 + 35 * Math.sqrt(spawnIndex); // 35 provides a nice wide gap
          
          updatedNodes.push({
            id: `node-txt-${label}`,
            label: label,
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle)
          });
          newlyAddedCount++;
        }
      });

      // Rebuild edges with correct ID mappings
      const updatedEdges = parsedEdges.map((e, i) => {
        const sourceNode = updatedNodes.find(n => n.label === e.sourceLabel)!;
        const targetNode = updatedNodes.find(n => n.label === e.targetLabel)!;
        return {
          id: `edge-txt-${i}`,
          source: sourceNode.id,
          target: targetNode.id,
          weight: e.weight
        };
      });

      setEdges(updatedEdges);
      return updatedNodes;
    });


    // Reset visualizer state when graph structure changes
    stopAnimation();
    setResult(null);
    setCurrentStep(-1);
  }, [stopAnimation]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (mode !== 'add-node') return;
    
    // 1. Smart Labeling: Find the next available letter (A, B, C...)
    const existingLabels = new Set(nodes.map(n => n.label));
    let index = 0;
    let newLabel = '';
    while (true) {
      const char = String.fromCharCode(65 + (index % 26));
      const suffix = index >= 26 ? Math.floor(index / 26) : '';
      newLabel = char + suffix;
      if (!existingLabels.has(newLabel)) break;
      index++;
    }

    const newNode: GraphNode = {
      id: `node-${nodeIdCounter.current++}`,
      x, y,
      label: newLabel,
    };
    setNodes(prev => [...prev, newNode]);

    // 2. Sync to Text Box
    setGraphText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${newLabel}` : newLabel;
    });
  }, [mode, nodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (mode === 'add-edge') {
      if (!addingEdge) {
        setAddingEdge({ sourceId: nodeId });
      } else {
        if (addingEdge.sourceId !== nodeId) {
          const weight = config.weighted ? parseFloat(prompt('Edge weight:', '1') || '1') : 1;
          const newEdge: GraphEdge = {
            id: `edge-${edgeIdCounter.current++}`,
            source: addingEdge.sourceId,
            target: nodeId,
            weight: isNaN(weight) ? 1 : weight,
          };
          setEdges(prev => [...prev, newEdge]);

          // Sync the new edge to the text box
          const srcLabel = nodes.find(n => n.id === addingEdge.sourceId)?.label || '';
          const tgtLabel = nodes.find(n => n.id === nodeId)?.label || '';
          const edgeString = config.weighted ? `${srcLabel} ${tgtLabel} ${newEdge.weight}` : `${srcLabel} ${tgtLabel}`;
          
          setGraphText(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed}\n${edgeString}` : edgeString;
          });
        }
        setAddingEdge(null);
      }
    } else if (mode === 'select') {
      setSelectedNode(prev => prev === nodeId ? null : nodeId);
    }
  }, [mode, addingEdge, config.weighted, nodes]);


  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (startNode === nodeId) setStartNode('');
    if (endNode === nodeId) setEndNode('');

    // Remove the node and any lines containing its label from the text box
    setGraphText(prev => {
      const lines = prev.split('\n');
      const newLines = lines.filter(line => {
        const parts = line.trim().split(/\s+/);
        return !parts.includes(nodeToDelete.label);
      });
      return newLines.join('\n');
    });
  }, [nodes, startNode, endNode]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    const edgeToDelete = edges.find(e => e.id === edgeId);
    if (!edgeToDelete) return;

    const srcLabel = nodes.find(n => n.id === edgeToDelete.source)?.label;
    const tgtLabel = nodes.find(n => n.id === edgeToDelete.target)?.label;

    setEdges(prev => prev.filter(e => e.id !== edgeId));

    // Remove the specific edge from the text box
    setGraphText(prev => {
      const lines = prev.split('\n');
      const newLines = lines.filter(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] === srcLabel && parts[1] === tgtLabel) {
          return false;
        }
        return true;
      });
      return newLines.join('\n');
    });
  }, [edges, nodes]);

  const runAlgorithm = useCallback(async () => {
    if (!startNode || nodes.length < 2) {
      setError('Please add at least 2 nodes and select a start node.');
      return;
    }
    if (algorithm === 'dijkstra' && !config.weighted) {
      setError('Dijkstra requires a weighted graph. Enable weights first.');
      return;
    }
    setError('');
    setIsLoading(true);
    stopAnimation();
    setCurrentStep(-1);
    setResult(null);

    try {
      const payload = {
        nodes: nodes.map(n => n.id),
        edges: edges.map(e => ({ source: e.source, target: e.target, weight: e.weight })),
        directed: config.directed,
        weighted: config.weighted,
        algorithm,
        start_node: startNode,
        end_node: endNode || null,
      };

      const response = await fetch(`${API_BASE}/run-algorithm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Algorithm failed');
      }

      const data: AlgorithmResult = await response.json();
      setResult(data);
      setCurrentStep(0);
      setIsRunning(true);

      let step = 0;
      intervalRef.current = setInterval(() => {
        step += 1;
        if (step >= data.steps.length) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setCurrentStep(data.steps.length - 1);
        } else {
          setCurrentStep(step);
        }
      }, speed);
    } catch (e: any) {
      setError(e.message || 'Failed to connect to backend');
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, config, algorithm, startNode, endNode, speed, stopAnimation]);

  const pauseResume = useCallback(() => {
    if (!result) return;
    if (isRunning) {
      stopAnimation();
    } else {
      setIsRunning(true);
      let step = currentStep;
      intervalRef.current = setInterval(() => {
        step += 1;
        if (step >= result.steps.length) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setCurrentStep(result.steps.length - 1);
        } else {
          setCurrentStep(step);
        }
      }, speed);
    }
  }, [result, isRunning, currentStep, speed, stopAnimation]);

  const stepForward = useCallback(() => {
    if (result && currentStep < result.steps.length - 1) {
      stopAnimation();
      setCurrentStep(s => s + 1);
    }
  }, [result, currentStep, stopAnimation]);

  const stepBack = useCallback(() => {
    if (currentStep > 0) {
      stopAnimation();
      setCurrentStep(s => s - 1);
    }
  }, [currentStep, stopAnimation]);

  const reset = useCallback(() => {
    stopAnimation();
    setResult(null);
    setCurrentStep(-1);
    setError('');
  }, [stopAnimation]);

  const clearGraph = useCallback(() => {
    stopAnimation();
    setNodes([]);
    setEdges([]);
    setGraphText(''); // Clear text box as well
    setResult(null);
    setCurrentStep(-1);
    setStartNode('');
    setEndNode('');
    nodeIdCounter.current = 0;
    edgeIdCounter.current = 0;
  }, [stopAnimation]);

  const loadExample = useCallback(() => {
    clearGraph();
    // Pre-populate text area
    const exampleText = "A B 4\nA C 2\nB D 5\nB E 1\nC F 3\nC G 7\nE F 6";
    handleGraphTextChange(exampleText);
    
    // Automatically set start/end nodes based on labels
    setTimeout(() => {
        setStartNode('node-txt-A');
        setEndNode('node-txt-F');
    }, 50); // slight delay to allow state batched updates
  }, [clearGraph, handleGraphTextChange]);

  // Inside App.tsx
  useEffect(() => {
    if (startNode && !nodes.find(n => n.id === startNode)) setStartNode('');
    if (endNode && !nodes.find(n => n.id === endNode)) setEndNode('');
  }, [nodes, startNode, endNode]);

  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  const currentStepData: AlgorithmStep | null = result && currentStep >= 0 ? result.steps[currentStep] : null;
  const nodeStates = getNodeStates();
  const distances = getCurrentDistances();

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-area">
            <img 
              src={logoImage} 
              alt="GRAPHIX Logo" 
              style={{ 
                width: '70px', 
                height: '48px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                flexShrink: 0
              }} 
            />
            <div>
              <h1 className="app-title">GRAPHIX</h1>
              <p className="app-subtitle">Algorithm Visualizer</p>
            </div>
          </div>
          <div className="header-badges">
            <span className="badge badge-bfs">BFS</span>
            <span className="badge badge-dfs">DFS</span>
            <span className="badge badge-dijk">Dijkstra</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <ControlPanel
            nodes={nodes}
            edges={edges}
            config={config}
            algorithm={algorithm}
            startNode={startNode}
            endNode={endNode}
            mode={mode}
            speed={speed}
            isRunning={isRunning}
            isLoading={isLoading}
            addingEdge={addingEdge}
            graphText={graphText}
            
            onConfigChange={setConfig}
            onAlgorithmChange={setAlgorithm}
            onStartNodeChange={setStartNode}
            onEndNodeChange={setEndNode}
            onModeChange={setMode}
            onSpeedChange={setSpeed}
            onRun={runAlgorithm}
            onPauseResume={pauseResume}
            onStepForward={stepForward}
            onStepBack={stepBack}
            onReset={reset}
            onClearGraph={clearGraph}
            onLoadExample={loadExample}
            onCancelEdge={() => setAddingEdge(null)}
            onGraphTextChange={handleGraphTextChange}
          />
        </div>

        <div className="center-panel">
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠</span> {error}
            </div>
          )}

          <div className="canvas-wrapper">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              config={config}
              nodeStates={nodeStates}
              distances={distances}
              algorithm={algorithm}
              addingEdge={addingEdge}
              selectedNode={selectedNode}
              mode={mode}
              onCanvasClick={handleCanvasClick}
              onNodeClick={handleNodeClick}
              onNodeDrag={handleNodeDrag}
              onDeleteNode={handleDeleteNode}
              onDeleteEdge={handleDeleteEdge}
            />
            <div className="canvas-mode-badge">
              {mode === 'add-node' && <span>🟢 Click canvas to place node</span>}
              {mode === 'add-edge' && !addingEdge && <span>🔵 Click source node</span>}
              {mode === 'add-edge' && addingEdge && <span>🟡 Click target node</span>}
              {mode === 'select' && <span>🔴 Select & drag nodes</span>}
            </div>
          </div>

          <div className="legend">
            <div className="legend-item"><span className="legend-dot dot-unvisited"/> Unvisited</div>
            <div className="legend-item"><span className="legend-dot dot-start"/> Start</div>
            <div className="legend-item"><span className="legend-dot dot-end"/> End</div>
            <div className="legend-item"><span className="legend-dot dot-current"/> Current</div>
            <div className="legend-item"><span className="legend-dot dot-frontier"/> Frontier</div>
            <div className="legend-item"><span className="legend-dot dot-visited"/> Visited</div>
            <div className="legend-item"><span className="legend-dot dot-path"/> Path</div>
          </div>
        </div>

        <div className="right-panel">
          <TraversalLog
            result={result}
            currentStep={currentStep}
            currentStepData={currentStepData}
            nodes={nodes}
            algorithm={algorithm}
          />
        </div>
      </main>
    </div>
  );
}