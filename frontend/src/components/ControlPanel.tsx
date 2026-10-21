import { GraphNode, GraphEdge, GraphConfig, AlgorithmType } from '../types';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: GraphConfig;
  algorithm: AlgorithmType;
  startNode: string;
  endNode: string;
  mode: 'add-node' | 'add-edge' | 'select';
  speed: number;
  isRunning: boolean;
  isLoading: boolean;
  addingEdge: { sourceId: string } | null;
  graphText: string;
  
  onConfigChange: (config: GraphConfig) => void;
  onAlgorithmChange: (algo: AlgorithmType) => void;
  onStartNodeChange: (id: string) => void;
  onEndNodeChange: (id: string) => void;
  onModeChange: (mode: 'add-node' | 'add-edge' | 'select') => void;
  onSpeedChange: (speed: number) => void;
  onRun: () => void;
  onPauseResume: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onClearGraph: () => void;
  onLoadExample: () => void;
  onCancelEdge: () => void;
  onGraphTextChange: (text: string) => void;
}

export default function ControlPanel({
  nodes, edges, config, algorithm, startNode, endNode, mode, speed,
  isRunning, isLoading, addingEdge, graphText,
  onConfigChange, onAlgorithmChange, onStartNodeChange, onEndNodeChange,
  onModeChange, onSpeedChange, onRun, onPauseResume, onStepForward,
  onStepBack, onReset, onClearGraph, onLoadExample, onCancelEdge, onGraphTextChange
}: Props) {

  const algorithms: { value: AlgorithmType; label: string; color: string; desc: string }[] = [
    { value: 'bfs', label: 'BFS', color: '#00aaff', desc: 'Breadth-First Search' },
    { value: 'dfs', label: 'DFS', color: '#00f5c4', desc: 'Depth-First Search' },
    { value: 'dijkstra', label: 'Dijkstra', color: '#ff6b35', desc: "Shortest Path" },
  ];

  return (
    <div className="control-panel">
      {/* Graph Tools */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">⬡</span> Graph Tools
        </h3>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${mode === 'add-node' ? 'mode-btn-active' : ''}`}
            onClick={() => onModeChange('add-node')}
          >
            <span className="mode-btn-icon">⊕</span>
            <span>Add Node</span>
          </button>
          <button
            className={`mode-btn ${mode === 'add-edge' ? 'mode-btn-active' : ''}`}
            onClick={() => { onModeChange('add-edge'); }}
          >
            <span className="mode-btn-icon">⟶</span>
            <span>Add Edge</span>
          </button>
          <button
            className={`mode-btn ${mode === 'select' ? 'mode-btn-active' : ''}`}
            onClick={() => onModeChange('select')}
          >
            <span className="mode-btn-icon">✥</span>
            <span>Move</span>
          </button>
        </div>
        {addingEdge && (
          <button className="cancel-edge-btn" onClick={onCancelEdge}>
            ✕ Cancel Edge
          </button>
        )}
        
        {/* Text Area for Edge List Input */}
        <div className="text-input-section" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="node-select-label" style={{ fontSize: '11px', color: '#7a9ab8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span className="start-dot" style={{ color: '#00aaff' }}>📝</span> Edge List Input
          </label>
          <textarea 
            value={graphText}
            onChange={(e) => onGraphTextChange(e.target.value)}
            placeholder="A B 5&#10;A C&#10;B D 2"
            rows={5}
            style={{
              width: '100%',
              backgroundColor: '#0a1526',
              color: '#00aaff',
              border: '1px solid #1e3050',
              borderRadius: '4px',
              padding: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = '#00aaff'}
            onBlur={(e) => e.target.style.borderColor = '#1e3050'}
          />
        </div>

        <div className="utility-buttons" style={{ marginTop: '16px' }}>
          <button className="util-btn" onClick={onLoadExample}>
            📡 Load Example
          </button>
          <button className="util-btn util-btn-danger" onClick={onClearGraph}>
            🗑 Clear All
          </button>
        </div>
        <div className="graph-stats">
          <div className="stat"><span className="stat-val">{nodes.length}</span><span className="stat-lbl">Nodes</span></div>
          <div className="stat-divider"/>
          <div className="stat"><span className="stat-val">{edges.length}</span><span className="stat-lbl">Edges</span></div>
        </div>
      </section>

      {/* Graph Config */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">⚙</span> Graph Config
        </h3>
        <div className="toggle-group">
          <label className="toggle-label">
            <span className="toggle-text">Directed</span>
            <div
              className={`toggle-switch ${config.directed ? 'toggle-on' : ''}`}
              onClick={() => onConfigChange({ ...config, directed: !config.directed })}
            >
              <div className="toggle-thumb"/>
            </div>
          </label>
          <label className="toggle-label">
            <span className="toggle-text">Weighted</span>
            <div
              className={`toggle-switch ${config.weighted ? 'toggle-on' : ''}`}
              onClick={() => onConfigChange({ ...config, weighted: !config.weighted })}
            >
              <div className="toggle-thumb"/>
            </div>
          </label>
        </div>
      </section>

      {/* Algorithm Selection */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">◈</span> Algorithm
        </h3>
        <div className="algo-buttons">
          {algorithms.map(a => (
            <button
              key={a.value}
              className={`algo-btn ${algorithm === a.value ? 'algo-btn-active' : ''}`}
              style={{ '--algo-color': a.color } as React.CSSProperties}
              onClick={() => onAlgorithmChange(a.value)}
            >
              <span className="algo-btn-label">{a.label}</span>
              <span className="algo-btn-desc">{a.desc}</span>
            </button>
          ))}
        </div>
        {algorithm === 'dijkstra' && !config.weighted && (
          <p className="algo-warning">⚠ Enable Weighted graph for Dijkstra</p>
        )}
      </section>

      {/* Node Selection */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">◎</span> Node Selection
        </h3>
        <div className="node-select-group">
          <div className="node-select-item">
            <label className="node-select-label">
              <span className="start-dot">●</span> Start Node
            </label>
            <select
              className="node-select"
              value={startNode}
              onChange={e => onStartNodeChange(e.target.value)}
            >
              <option value="">— select —</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
          <div className="node-select-item">
            <label className="node-select-label">
              <span className="end-dot">●</span> End Node (opt.)
            </label>
            <select
              className="node-select"
              value={endNode}
              onChange={e => onEndNodeChange(e.target.value)}
            >
              <option value="">— none —</option>
              {nodes.filter(n => n.id !== startNode).map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Speed */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">⚡</span> Speed
          <span className="speed-label">{speed}ms/step</span>
        </h3>
        <input
          type="range"
          min="100"
          max="2000"
          step="100"
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          className="speed-slider"
        />
        <div className="speed-range-labels">
          <span>Fast</span>
          <span>Slow</span>
        </div>
      </section>

      {/* Playback Controls */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-icon">▶</span> Controls
        </h3>
        <button
          className="run-btn"
          onClick={onRun}
          disabled={isLoading || nodes.length < 2 || !startNode}
        >
          {isLoading ? (
            <><span className="spinner"/> Computing...</>
          ) : (
            <><span>▶</span> Run {algorithm.toUpperCase()}</>
          )}
        </button>
        <div className="playback-buttons">
          <button className="pb-btn" onClick={onStepBack} title="Step Back">⏮</button>
          <button className="pb-btn" onClick={onPauseResume} title={isRunning ? 'Pause' : 'Resume'}>
            {isRunning ? '⏸' : '⏵'}
          </button>
          <button className="pb-btn" onClick={onStepForward} title="Step Forward">⏭</button>
          <button className="pb-btn pb-btn-reset" onClick={onReset} title="Reset">↺</button>
        </div>
      </section>
    </div>
  );
}