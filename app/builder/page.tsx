'use client'

import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AgentCanvas } from '@/components/canvas/AgentCanvas'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { NodeConfig } from '@/components/sidebar/NodeConfig'
import { OutputPanel } from '@/components/output/OutputPanel'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useGraphStore } from '@/store/graphStore'
import { marketResearchNodes, marketResearchEdges } from '@/components/demo/marketResearchFlow'

export default function Page() {
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const nodes = useGraphStore((s) => s.nodes)
  const sidebarOpen = useGraphStore((s) => s.sidebarOpen)
  const setSidebarOpen = useGraphStore((s) => s.setSidebarOpen)

  useEffect(() => {
    if (nodes.length === 0) {
      loadGraph(marketResearchNodes, marketResearchEdges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlowProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} defaultOpen={false}>
        <Sidebar />
        <SidebarInset className="flex h-screen min-w-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
          <Toolbar />
          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex-1">
              <AgentCanvas />
            </div>
            <NodeConfig />
          </div>
          <OutputPanel />
        </SidebarInset>
      </SidebarProvider>
    </ReactFlowProvider>
  )
}
