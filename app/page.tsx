'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { AgentCanvas } from '@/components/canvas/AgentCanvas'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { NodeConfig } from '@/components/sidebar/NodeConfig'

export default function Page() {
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
      </div>
    </ReactFlowProvider>
  )
}
