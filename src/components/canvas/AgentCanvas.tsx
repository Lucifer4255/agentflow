'use client'

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import { useGraphStore } from '@/store/graphStore'
import { AgentNode } from './AgentNode'
import { InputNode } from './InputNode'
import { RouterNode } from './RouterNode'

export function AgentCanvas() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const onNodesChange = useGraphStore((s) => s.onNodesChange)
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange)
  const onConnect = useGraphStore((s) => s.onConnect)
  const selectNode = useGraphStore((s) => s.selectNode)
  const running = useGraphStore((s) => s.running)

  const nodeTypes = useMemo(() => ({ agentNode: AgentNode, inputNode: InputNode, routerNode: RouterNode }), [])

  const onNodeClick: NodeMouseHandler = (_, node) => selectNode(node.id)
  const onPaneClick = () => selectNode(null)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges.map((e) => ({ ...e, animated: running }))}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        style: { stroke: '#71717a', strokeWidth: 2 },
      }}
    >
      <Background gap={20} size={1} color="#27272a" />
      <Controls className="!bg-zinc-900 !border-zinc-700 [&>button]:!bg-zinc-900 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300" />
      <MiniMap
        pannable
        zoomable
        className="!bg-zinc-900 !border !border-zinc-700"
        nodeColor="#3f3f46"
        maskColor="rgba(0,0,0,0.6)"
      />
    </ReactFlow>
  )
}
