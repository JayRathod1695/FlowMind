import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { logPageNavigated } from '@/lib/logger'
import { useConnectorStore } from '@/store/connector.store'

import { useExecutionStore } from '@/store/execution.store'

const getLinkClass = (isActive: boolean) =>
  [
    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 cursor-pointer',
    isActive
      ? 'border-[#007AFF] bg-[#007AFF] text-[#000000] shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
      : 'border-transparent text-[#000000] hover:border-[#007AFF] hover:bg-[#FFFFFF]',
  ].join(' ')

const isPathActive = (pathname: string, targetPath: string): boolean => {
  if (targetPath === '/') {
    return pathname === '/'
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`)
}

function NavigationBar() {
  const location = useLocation()
  const executionId = useExecutionStore((state) => state.executionId)
  const hasConnectorError = useConnectorStore((state) =>
    Object.values(state.connections).some((connection) => connection.status === 'error'),
  )
  const executionPath = executionId ? `/execution/${executionId}` : '/'

  useEffect(() => {
    logPageNavigated({
      path: location.pathname,
      search: location.search,
    })
  }, [location.pathname, location.search])

  return (
    <header className="border-b border-[#AFAFAF] bg-[#E5E5E5]/95 shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 md:px-8" aria-label="Main">
        <Link to="/" className={getLinkClass(isPathActive(location.pathname, '/'))}>
          Home
        </Link>
        <Link to="/dag" className={getLinkClass(isPathActive(location.pathname, '/dag'))}>
          DAG
        </Link>
        <Link to={executionPath} className={getLinkClass(isPathActive(location.pathname, '/execution'))}>
          Execution
        </Link>
        <Link to="/status" className={getLinkClass(isPathActive(location.pathname, '/status'))}>
          Status
        </Link>
        <Link to="/connectors" className={getLinkClass(isPathActive(location.pathname, '/connectors'))}>
          <span className="inline-flex items-center gap-2">
            Connections
            {hasConnectorError ? <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" aria-label="Connection warning" /> : null}
          </span>
        </Link>
      </nav>
    </header>
  )
}

export default NavigationBar
