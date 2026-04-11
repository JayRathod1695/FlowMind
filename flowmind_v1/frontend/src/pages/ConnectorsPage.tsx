import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import ConnectorLibrary from '@/components/connectors/ConnectorLibrary'

function ConnectorsPage() {
  return (
    <section className="space-y-6 text-[#000000]">
      <header className="space-y-3">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#AFAFAF] bg-[#E5E5E5] px-3 py-1.5 text-sm font-medium text-[#1F1F1F] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#FFFFFF] hover:text-[#000000]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-[#000000]">Connections</h1>
          <p className="max-w-3xl text-[#1F1F1F]">
            Connect your accounts to let FlowMind act on your behalf.
          </p>
        </div>
      </header>

      <ConnectorLibrary />
    </section>
  )
}

export default ConnectorsPage
