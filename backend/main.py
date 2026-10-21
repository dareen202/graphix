from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import heapq
import math

app = FastAPI(title="Graph Algorithms API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Edge(BaseModel):
    source: str
    target: str
    weight: Optional[float] = 1.0

class GraphRequest(BaseModel):
    nodes: list[str]
    edges: list[Edge]
    directed: bool = False
    weighted: bool = False
    algorithm: str
    start_node: str
    end_node: Optional[str] = None

def build_adjacency(nodes, edges, directed, weighted):
    graph = {node: [] for node in nodes}
    for edge in edges:
        w = edge.weight if weighted else 1.0
        graph[edge.source].append((edge.target, w))
        if not directed:
            graph[edge.target].append((edge.source, w))
    return graph

def bfs(graph, nodes, start, end):
    steps = []
    visited = set()
    queue = [start]
    visited.add(start)
    parent = {start: None}
    traversal_order = []

    while queue:
        current = queue.pop(0)
        traversal_order.append(current)

        neighbors = [n for n, _ in graph.get(current, [])]
        steps.append({
            "current": current,
            "visited": list(visited),
            "frontier": list(queue),
            "neighbors": neighbors,
            "distances": {},
            "description": f"Visiting node {current}, queue: [{', '.join(queue)}]"
        })

        if current == end:
            break

        for neighbor, _ in graph.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                parent[neighbor] = current
                queue.append(neighbor)

    path = []
    if end and end in parent:
        node = end
        while node is not None:
            path.append(node)
            node = parent[node]
        path.reverse()

    return steps, traversal_order, path

def dfs(graph, nodes, start, end):
    steps = []
    visited = set()
    stack = [start]
    parent = {start: None}
    traversal_order = []
    visited_in_order = []

    while stack:
        current = stack.pop()
        if current in visited_in_order:
            continue
        visited_in_order.append(current)
        visited.add(current)
        traversal_order.append(current)

        neighbors = [n for n, _ in graph.get(current, [])]
        steps.append({
            "current": current,
            "visited": list(visited),
            "frontier": list(stack),
            "neighbors": neighbors,
            "distances": {},
            "description": f"Visiting node {current}, stack: [{', '.join(stack)}]"
        })

        if current == end:
            break

        for neighbor, _ in reversed(graph.get(current, [])):
            if neighbor not in visited:
                if neighbor not in parent:
                    parent[neighbor] = current
                stack.append(neighbor)

    path = []
    if end and end in parent:
        node = end
        while node is not None:
            path.append(node)
            node = parent[node]
        path.reverse()

    return steps, traversal_order, path

def dijkstra(graph, nodes, start, end):
    steps = []
    distances = {node: math.inf for node in nodes}
    distances[start] = 0
    visited = set()
    parent = {start: None}
    pq = [(0, start)]
    traversal_order = []

    while pq:
        dist, current = heapq.heappop(pq)

        if current in visited:
            continue
        visited.add(current)
        traversal_order.append(current)

        neighbors = [n for n, _ in graph.get(current, [])]
        display_dists = {k: (v if v != math.inf else -1) for k, v in distances.items()}
        steps.append({
            "current": current,
            "visited": list(visited),
            "frontier": [item[1] for item in pq],
            "neighbors": neighbors,
            "distances": display_dists,
            "description": f"Processing {current} (dist={dist}), relaxing neighbors"
        })

        if current == end:
            break

        for neighbor, weight in graph.get(current, []):
            new_dist = dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                parent[neighbor] = current
                heapq.heappush(pq, (new_dist, neighbor))

    path = []
    if end and end in parent:
        node = end
        while node is not None:
            path.append(node)
            node = parent.get(node)
        path.reverse()

    final_dists = {k: (v if v != math.inf else -1) for k, v in distances.items()}
    return steps, traversal_order, path, final_dists

@app.post("/run-algorithm")
async def run_algorithm(request: GraphRequest):
    if request.start_node not in request.nodes:
        raise HTTPException(status_code=400, detail=f"Start node '{request.start_node}' not in graph")
    if request.end_node and request.end_node not in request.nodes:
        raise HTTPException(status_code=400, detail=f"End node '{request.end_node}' not in graph")

    graph = build_adjacency(request.nodes, request.edges, request.directed, request.weighted)
    algo = request.algorithm.lower()

    if algo == "bfs":
        steps, order, path = bfs(graph, request.nodes, request.start_node, request.end_node)
        return {"algorithm": "BFS", "steps": steps, "traversal_order": order, "path": path, "final_distances": {}}
    elif algo == "dfs":
        steps, order, path = dfs(graph, request.nodes, request.start_node, request.end_node)
        return {"algorithm": "DFS", "steps": steps, "traversal_order": order, "path": path, "final_distances": {}}
    elif algo == "dijkstra":
        if not request.weighted:
            raise HTTPException(status_code=400, detail="Dijkstra requires a weighted graph")
        steps, order, path, final_dists = dijkstra(graph, request.nodes, request.start_node, request.end_node)
        return {"algorithm": "Dijkstra", "steps": steps, "traversal_order": order, "path": path, "final_distances": final_dists}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algo}")

@app.get("/health")
async def health():
    return {"status": "ok"}
