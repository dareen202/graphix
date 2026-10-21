import { AlgorithmResult, AlgorithmStep, GraphNode, AlgorithmType } from '../types';

interface Props {
  result: AlgorithmResult | null;
  currentStep: number;
  currentStepData: AlgorithmStep | null;
  nodes: GraphNode[];
  algorithm: AlgorithmType;
}

export default function TraversalLog({ result, currentStep, currentStepData, nodes, algorithm }: Props) {
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label || id;

  return (
    <div className="traversal-log">
      <div className="log-header">
        <h3 className="log-title">
          <span className="log-title-icon">⟐</span>
          Algorithm Log
        </h3>
        {result && (
          <span className="step-counter">
            Step {currentStep + 1} / {result.steps.length}
          </span>
        )}
      </div>

      {!result ? (
        <div className="log-empty">
          <div className="log-empty-icon">◫</div>
          <p>Run an algorithm to see the execution log here.</p>
          <p className="log-empty-sub">Set up your graph, choose algorithm & nodes, then hit Run.</p>
        </div>
      ) : (
        <>
          {/* Current Step Info */}
          {currentStepData && (
            <div className="current-step-card">
              <div className="step-desc">{currentStepData.description}</div>
              <div className="step-details">
                <div className="step-detail-row">
                  <span className="step-detail-lbl">Current:</span>
                  <span className="step-detail-val node-badge node-badge-current">
                    {getLabel(currentStepData.current)}
                  </span>
                </div>
                <div className="step-detail-row">
                  <span className="step-detail-lbl">Visited:</span>
                  <div className="node-badge-list">
                    {currentStepData.visited.map(id => (
                      <span key={id} className="node-badge node-badge-visited">{getLabel(id)}</span>
                    ))}
                  </div>
                </div>
                {currentStepData.frontier.length > 0 && (
                  <div className="step-detail-row">
                    <span className="step-detail-lbl">{algorithm === 'dfs' ? 'Stack:' : 'Queue:'}</span>
                    <div className="node-badge-list">
                      {currentStepData.frontier.map((id, i) => (
                        <span key={`${id}-${i}`} className="node-badge node-badge-frontier">{getLabel(id)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dijkstra Distances Table */}
          {algorithm === 'dijkstra' && currentStepData && Object.keys(currentStepData.distances).length > 0 && (
            <div className="distances-card">
              <h4 className="distances-title">📊 Distance Table</h4>
              <div className="distances-table">
                <div className="dist-row dist-header">
                  <span>Node</span>
                  <span>Distance</span>
                </div>
                {Object.entries(currentStepData.distances).map(([id, dist]) => (
                  <div
                    key={id}
                    className={`dist-row ${id === currentStepData.current ? 'dist-row-active' : ''}`}
                  >
                    <span className="dist-node">{getLabel(id)}</span>
                    <span className="dist-val">
                      {dist === -1 ? <span className="dist-inf">∞</span> : (
                        <span className="dist-num">{dist}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traversal Order */}
          <div className="traversal-order-card">
            <h4 className="traversal-order-title">🔢 Traversal Order</h4>
            <div className="traversal-order-list">
              {result.traversal_order.map((id, idx) => (
                <div key={id} className={`traversal-item ${idx <= currentStep ? 'traversal-item-done' : 'traversal-item-pending'}`}>
                  <span className="traversal-idx">{idx + 1}</span>
                  <span className="traversal-node">{getLabel(id)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Path found (shown at end) */}
          {result.path.length > 0 && currentStep === result.steps.length - 1 && (
            <div className="path-card">
              <h4 className="path-title"> {algorithm === 'dfs' ? '🏁 Path Found' : '🏁 Shortest Path Found'}</h4>
              <div className="path-sequence">
                {result.path.map((id, idx) => (
                  <span key={id}>
                    <span className="path-node">{getLabel(id)}</span>
                    {idx < result.path.length - 1 && <span className="path-arrow">→</span>}
                  </span>
                ))}
              </div>
              {algorithm === 'dijkstra' && result.final_distances && (
                <div className="path-cost">
                  Total cost: <strong>
                    {result.final_distances[result.path[result.path.length - 1]] === -1 
                      ? '∞' 
                      : result.final_distances[result.path[result.path.length - 1]]
                    }
                  </strong>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
