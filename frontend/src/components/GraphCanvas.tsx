import { useRef, useCallback, useState } from 'react';
import { GraphNode, GraphEdge, GraphConfig, NodeState, AlgorithmType } from '../types';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: GraphConfig;
  nodeStates: Record<string, NodeState>;
  distances: Record<string, number>;
  algorithm: AlgorithmType;
  addingEdge: { sourceId: string } | null;
  selectedNode: string | null;
  mode: 'add-node' | 'add-edge' | 'select';
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

const NODE_RADIUS = 26;

const NODE_COLORS: Record<NodeState, { fill: string; stroke: string; glow: string; text: string }> = {
  unvisited:  { fill: '#1a1f2e', stroke: '#334155',  glow: 'none', text: '#94a3b8' },
  start:      { fill: '#0f4c20', stroke: '#00f5a0',  glow: '#00f5a0', text: '#00f5a0' },
  end:        { fill: '#4c0f2a', stroke: '#ff3d7a',  glow: '#ff3d7a', text: '#ff3d7a' },
  current:    { fill: '#ff6b35', stroke: '#ff9a6c',  glow: '#ff6b35', text: '#fff' },
  frontier:   { fill: '#1e3a5f', stroke: '#00aaff',  glow: '#00aaff', text: '#00aaff' },
  visited:    { fill: '#1f3544', stroke: '#00f5c4',  glow: '#00f5c4', text: '#00f5c4' },
  path:       { fill: '#3d2a00', stroke: '#ffcc00',  glow: '#ffcc00', text: '#ffcc00' },
};

export default function GraphCanvas({
  nodes, edges, config, nodeStates, distances, algorithm,
  addingEdge, selectedNode, mode,
  onCanvasClick, onNodeClick, onNodeDrag, onDeleteNode, onDeleteEdge
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);

  const getSVGCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (contextMenu) { setContextMenu(null); return; }
    if (dragging.current) return;
    const target = e.target as Element;
    if (target.closest('.node-group')) return;
    const { x, y } = getSVGCoords(e);
    onCanvasClick(x, y);
  }, [onCanvasClick, getSVGCoords, contextMenu]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (mode === 'select') {
      const node = nodes.find(n => n.id === nodeId)!;
      const { x, y } = getSVGCoords(e);
      dragging.current = { nodeId, offsetX: x - node.x, offsetY: y - node.y };
    }
  }, [mode, nodes, getSVGCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const { x, y } = getSVGCoords(e);
    onNodeDrag(dragging.current.nodeId, x - dragging.current.offsetX, y - dragging.current.offsetY);
  }, [getSVGCoords, onNodeDrag]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (mode === 'select' && dragging.current) return;
    onNodeClick(nodeId);
  }, [mode, onNodeClick]);

  const handleNodeRightClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getSVGCoords(e);
    setContextMenu({ x, y, nodeId });
  }, [getSVGCoords]);

  const handleEdgeRightClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getSVGCoords(e);
    setContextMenu({ x, y, edgeId });
  }, [getSVGCoords]);

  const isPathEdge = (edge: GraphEdge) => {
    if (!Object.values(nodeStates).includes('path')) return false;
    const pathNodes = Object.entries(nodeStates).filter(([, s]) => s === 'path' || s === 'start' || s === 'end').map(([id]) => id);
    return pathNodes.includes(edge.source) && pathNodes.includes(edge.target);
  };

  const getEdgeGeometry = (edge: GraphEdge) => {
    const src = nodes.find(n => n.id === edge.source);
    const tgt = nodes.find(n => n.id === edge.target);
    if (!src || !tgt) return { path: '', mx: 0, my: 0 };

    // Check if the opposite edge exists
    const isBidi = config.directed && edges.some(e => e.id !== edge.id && e.source === edge.target && e.target === edge.source);
    
    const dx = tgt.x - src.x, dy = tgt.y - src.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    const endOff = NODE_RADIUS + (config.directed ? 10 : 0);

    if (isBidi) {
      // Create a curved path (Quadratic Bezier)
      const curveOffset = 30; // How far the curve bows out
      const nx = -uy * curveOffset;
      const ny = ux * curveOffset;
      const cx = (src.x + tgt.x) / 2 + nx;
      const cy = (src.y + tgt.y) / 2 + ny;

      // Adjust start/end points so the arrow marker angles perfectly
      const dx2 = tgt.x - cx, dy2 = tgt.y - cy;
      const len2 = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
      const endX = tgt.x - (dx2/len2)*endOff;
      const endY = tgt.y - (dy2/len2)*endOff;

      const dx1 = cx - src.x, dy1 = cy - src.y;
      const len1 = Math.sqrt(dx1*dx1 + dy1*dy1) || 1;
      const startX = src.x + (dx1/len1)*NODE_RADIUS;
      const startY = src.y + (dy1/len1)*NODE_RADIUS;

      return {
        path: `M${startX},${startY} Q${cx},${cy} ${endX},${endY}`,
        mx: 0.25*startX + 0.5*cx + 0.25*endX, // Bezier curve midpoint X
        my: 0.25*startY + 0.5*cy + 0.25*endY  // Bezier curve midpoint Y
      };
    }

    // Straight line path
    const startX = src.x + ux*NODE_RADIUS;
    const startY = src.y + uy*NODE_RADIUS;
    const endX = tgt.x - ux*endOff;
    const endY = tgt.y - uy*endOff;
    return { 
      path: `M${startX},${startY} L${endX},${endY}`, 
      mx: (startX + endX) / 2, 
      my: (startY + endY) / 2 
    };
  };

  return (
    <svg
      ref={svgRef}
      className="graph-svg"
      onClick={handleSVGClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
    >
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#334155"/>
        </marker>
        <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#00f5c4"/>
        </marker>
        <marker id="arrow-path" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ffcc00"/>
        </marker>
        {Object.entries(NODE_COLORS).map(([state, colors]) => (
          colors.glow !== 'none' && (
            <filter key={state} id={`glow-${state}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={colors.glow} floodOpacity="0.8"/>
            </filter>
          )
        ))}
        <filter id="glow-hover">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ffffff" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Grid pattern */}
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2d3d" strokeWidth="0.5"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5"/>

      {/* Edges */}
      {edges.map(edge => {
        const geom = getEdgeGeometry(edge);
        if (!geom.path) return null;
        const { path, mx, my } = geom;

        const isPath = isPathEdge(edge);
        const isHovered = hoveredEdge === edge.id;
        const arrowId = isPath ? 'arrow-path' : config.directed ? 'arrow' : undefined;
        const edgeColor = isPath ? '#ffcc00' : isHovered ? '#00aaff' : '#334155';
        const edgeWidth = isPath ? 3 : isHovered ? 2.5 : 1.5;

        return (
          <g key={edge.id} className="edge-group"
            onMouseEnter={() => setHoveredEdge(edge.id)}
            onMouseLeave={() => setHoveredEdge(null)}
            onContextMenu={e => handleEdgeRightClick(e, edge.id)}
          >
            {/* Hover hitbox */}
            <path
              d={path}
              stroke="transparent" strokeWidth="16" fill="none"
              style={{ cursor: 'pointer' }}
            />
            {/* Actual visible edge */}
            <path
              d={path}
              stroke={edgeColor}
              strokeWidth={edgeWidth}
              fill="none"
              markerEnd={config.directed ? `url(#${arrowId || 'arrow'})` : undefined}
              strokeDasharray={isPath ? '6 3' : undefined}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
            {config.weighted && (
              <g>
                <circle cx={mx} cy={my} r="12" fill="#0d1117" stroke={edgeColor} strokeWidth="1"/>
                <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fill={edgeColor} fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                  {edge.weight}
                </text>
              </g>
            )}
            {isHovered && (
              <text x={mx + 16} y={my - 8} fontSize="9" fill="#64748b" fontFamily="monospace">
                right-click to delete
              </text>
            )}
          </g>
        );
      })}

      {/* Adding edge preview line */}
      {addingEdge && (() => {
        const src = nodes.find(n => n.id === addingEdge.sourceId);
        if (!src) return null;
        return (
          <line
            x1={src.x} y1={src.y}
            x2={src.x} y2={src.y}
            stroke="#00aaff" strokeWidth="2"
            strokeDasharray="5 4"
            className="edge-preview"
          />
        );
      })()}

      {/* Nodes */}
      {nodes.map(node => {
        const state = nodeStates[node.id] || 'unvisited';
        const colors = NODE_COLORS[state];
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const isAddingSource = addingEdge?.sourceId === node.id;
        const dist = distances[node.id];
        const showDist = algorithm === 'dijkstra' && dist !== undefined;

        return (
          <g
            key={node.id}
            className="node-group"
            transform={`translate(${node.x}, ${node.y})`}
            onClick={e => handleNodeClick(e, node.id)}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            onContextMenu={e => handleNodeRightClick(e, node.id)}
            style={{ cursor: mode === 'select' ? 'grab' : mode === 'add-edge' ? 'crosshair' : 'pointer' }}
          >
            {/* Outer glow ring */}
            {(state !== 'unvisited' || isHovered || isSelected || isAddingSource) && (
              <circle r={NODE_RADIUS + 8} fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.3"/>
            )}

            {/* Pulse animation for current node */}
            {state === 'current' && (
              <circle r={NODE_RADIUS + 4} fill="none" stroke="#ff6b35" strokeWidth="2" opacity="0.6">
                <animate attributeName="r" values={`${NODE_RADIUS + 4};${NODE_RADIUS + 16};${NODE_RADIUS + 4}`} dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* Main node circle */}
            <circle
              r={NODE_RADIUS}
              fill={colors.fill}
              stroke={isAddingSource ? '#ffcc00' : colors.stroke}
              strokeWidth={state === 'current' ? 3 : isSelected ? 3 : 2}
              filter={colors.glow !== 'none' ? `url(#glow-${state})` : isHovered ? 'url(#glow-hover)' : undefined}
              style={{ transition: 'fill 0.3s, stroke 0.3s' }}
            />

            {/* Node label */}
            <text
              textAnchor="middle"
              dominantBaseline={showDist ? 'auto' : 'central'}
              y={showDist ? -5 : 0}
              fontSize="14"
              fontWeight="bold"
              fill={colors.text}
              fontFamily="'JetBrains Mono', monospace"
              style={{ userSelect: 'none', transition: 'fill 0.3s' }}
            >
              {node.label}
            </text>

            {/* Distance label for Dijkstra */}
            {showDist && (
              <text
                textAnchor="middle"
                y={9}
                fontSize="9"
                fill={dist === -1 ? '#64748b' : '#ffcc00'}
                fontFamily="'JetBrains Mono', monospace"
                style={{ userSelect: 'none' }}
              >
                {dist === -1 ? '∞' : dist}
              </text>
            )}

            {/* State indicator badge */}
            {(state === 'start' || state === 'end') && (
              <text
                x={NODE_RADIUS - 4}
                y={-NODE_RADIUS + 4}
                fontSize="10"
                fill={colors.stroke}
                fontFamily="monospace"
                fontWeight="bold"
                style={{ userSelect: 'none' }}
              >
                {state === 'start' ? 'S' : 'E'}
              </text>
            )}

            {/* Hover tooltip */}
            {isHovered && mode === 'add-node' && (
              <text y={NODE_RADIUS + 16} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
                right-click to delete
              </text>
            )}
          </g>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <foreignObject x={contextMenu.x} y={contextMenu.y} width="160" height="80">
          <div className="context-menu">
            <button
              className="context-menu-item context-menu-delete"
              onClick={() => {
                if (contextMenu.nodeId) onDeleteNode(contextMenu.nodeId);
                if (contextMenu.edgeId) onDeleteEdge(contextMenu.edgeId);
                setContextMenu(null);
              }}
            >
              🗑 Delete {contextMenu.nodeId ? 'Node' : 'Edge'}
            </button>
            <button className="context-menu-item" onClick={() => setContextMenu(null)}>
              ✕ Cancel
            </button>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}