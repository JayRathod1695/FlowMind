import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import NavigationBar from '@/components/shared/NavigationBar'
import HomePage from '@/pages/HomePage'
import { useExecutionStore } from '@/store/execution.store'
import { useWorkflowStore } from '@/store/workflow.store'

const DAGPage = lazy(() => import('@/pages/DAGPage'))
const ExecutionPage = lazy(() => import('@/pages/ExecutionPage'))
const StatusPage = lazy(() => import('@/pages/StatusPage'))
const ConnectorsPage = lazy(() => import('@/pages/ConnectorsPage'))

const RouteSkeleton = () => (
  <div className="h-56 animate-pulse rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.05)]" />
)
const DAGRoute = () =>
  useWorkflowStore((state) => state.generatedDAG)?.length ? <DAGPage /> : <Navigate to="/" replace />
const ExecutionRoute = () =>
  useExecutionStore((state) => state.executionId) ? <ExecutionPage /> : <Navigate to="/" replace />

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-svh bg-[#888888] text-[#000000]">
        <NavigationBar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dag" element={<DAGRoute />} />
              <Route path="/execution/:id" element={<ExecutionRoute />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/connectors" element={<ConnectorsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
