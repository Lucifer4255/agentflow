import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { AgentNodeData } from "../types";

export type AgentNode = Node<AgentNodeData>

interface GraphState {
  nodes: AgentNode[]
  edges: Edge[]
  selectedNodeId: string | null
  running: boolean
  currentNodeId: string | null
  outputs: Record<string, string>
  errors: Record<string, string>
  activeOutputTab: string | null
  stopFn: (() => void) | null
  currentGraphId: string | null
  currentGraphName: string | null
  setCurrentGraph: (id: string | null, name: string | null) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (partial?: Partial<AgentNodeData>) => void
  updateNodeData: (id: string, patch: Partial<AgentNodeData>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void

  setStatus: (id: string, status: AgentNodeData['status']) => void
  setOutput: (id: string, output: string) => void
  appendOutput: (id: string, delta: string) => void
  setError: (id: string, error: string) => void
  beginRun: (stopFn: () => void) => void
  endRun: () => void
  setCurrentNode: (id: string | null) => void
  setActiveOutputTab: (id: string | null) => void

  loadGraph: (nodes: AgentNode[], edges: Edge[]) => void
  clear: () => void
}

const uid = () => `n_${Math.random().toString(36).slice(2, 9)}`

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  running: false,
  currentNodeId: null,
  outputs: {},
  errors: {},
  activeOutputTab: null,
  stopFn: null,
  currentGraphId: null,
  currentGraphName: null,

  setCurrentGraph: (id, name) => set({ currentGraphId: id, currentGraphName: name }),
  sidebarOpen: false,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as AgentNode[] }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, animated: false }, get().edges) }),

  addNode: (partial) => {
    const id = uid()
    const isInput = partial?.isInputNode ?? false
    const node: AgentNode = {
      id,
      type: isInput ? 'inputNode' : 'agentNode',
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: partial?.label ?? (isInput ? 'Input' : 'New Agent'),
        systemPrompt: partial?.systemPrompt ?? (isInput ? '' : 'You are a helpful agent.'),
        tools: partial?.tools ?? [],
        model: partial?.model,
        isInputNode: isInput,
        status: 'idle',
      },
    }
    set({ nodes: [...get().nodes, node], selectedNodeId: id })
  },

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  removeNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  setStatus: (id, status) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, status } } : n,
      ),
    })
  },

  setOutput: (id, output) =>
    set({
      outputs: { ...get().outputs, [id]: output },
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, output, status: 'done' } } : n,
      ),
      activeOutputTab: get().activeOutputTab ?? id,
    }),

  appendOutput: (id, delta) => {
    const prev = get().outputs[id] ?? ''
    const next = prev + delta
    set({
      outputs: { ...get().outputs, [id]: next },
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, output: next, status: 'running' } } : n,
      ),
      activeOutputTab: get().activeOutputTab ?? id,
    })
  },

  setError: (id, error) =>
    set({
      errors: { ...get().errors, [id]: error },
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, status: 'error' } } : n,
      ),
    }),

  beginRun: (stopFn) =>
    set({
      running: true,
      stopFn,
      outputs: {},
      errors: {},
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle', output: undefined },
      })),
    }),

  endRun: () => set({ running: false, currentNodeId: null, stopFn: null }),

  setCurrentNode: (id) => {
    set({ currentNodeId: id })
    if (id) {
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, status: 'running' } } : n,
        ),
      })
    }
  },

  setActiveOutputTab: (id) => set({ activeOutputTab: id }),

  loadGraph: (nodes, edges) =>
    set({
      nodes,
      edges,
      selectedNodeId: null,
      outputs: {},
      errors: {},
      running: false,
      currentNodeId: null,
      activeOutputTab: null,
    }),

  clear: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      outputs: {},
      errors: {},
      running: false,
      currentNodeId: null,
      activeOutputTab: null,
      currentGraphId: null,
      currentGraphName: null,
    }),
}))
