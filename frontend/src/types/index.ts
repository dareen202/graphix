export interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface GraphConfig {
  directed: boolean;
  weighted: boolean;
}

export type AlgorithmType = 'bfs' | 'dfs' | 'dijkstra';

export interface AlgorithmStep {
  current: string;
  visited: string[];
  frontier: string[];
  neighbors: string[];
  distances: Record<string, number>;
  description: string;
}

export interface AlgorithmResult {
  algorithm: string;
  steps: AlgorithmStep[];
  traversal_order: string[];
  path: string[];
  final_distances: Record<string, number>;
}

export type NodeState = 'unvisited' | 'frontier' | 'current' | 'visited' | 'path' | 'start' | 'end';
