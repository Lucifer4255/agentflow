'use client'

import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AgentCanvas } from '@/components/canvas/AgentCanvas'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { NodeConfig } from '@/components/sidebar/NodeConfig'
import { OutputPanel } from '@/components/output/OutputPanel'
import { useGraphStore } from '@/store/graphStore'
import { marketResearchNodes, marketResearchEdges } from '@/components/demo/marketResearchFlow'

export default function Page() {
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const nodes = useGraphStore((s) => s.nodes)

  useEffect(() => {
    if (nodes.length === 0) {
      loadGraph(marketResearchNodes, marketResearchEdges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1">
            <AgentCanvas />
          </div>
          <NodeConfig />
        </div>
        <OutputPanel />
      </div>
    </ReactFlowProvider>
  )
}
