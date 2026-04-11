import type { FormEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useWorkflowSubmit } from '@/hooks/useWorkflowSubmit'
import { useConnectorStore } from '@/store/connector.store'
import { useWorkflowStore } from '@/store/workflow.store'

const QUICK_PROMPTS = [
  'When a Jira ticket moves to Done, post summary in Slack and append a row in Google Sheets.',
  'For each GitHub PR merged to main, notify Slack and create a Jira release note task.',
  'Collect daily incident updates from Jira and publish an executive digest to Slack.',
] as const

function HomePage() {
  const prompt = useWorkflowStore((state) => state.naturalLanguageInput)
  const setInput = useWorkflowStore((state) => state.setInput)
  const connections = useConnectorStore((state) => state.connections)
  const { submitWorkflow, isSubmitting, error, clearError } = useWorkflowSubmit()

  const connectorValues = Object.values(connections)
  const connectedCount = connectorValues.filter((connection) => connection.status === 'connected').length
  const errorCount = connectorValues.filter((connection) => connection.status === 'error').length
  const isPromptEmpty = prompt.trim().length === 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitWorkflow({ naturalLanguage: prompt })
  }

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      void submitWorkflow({ naturalLanguage: prompt })
    }
  }

  return (
    <section className="space-y-8 text-[#000000]">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-[#000000] sm:text-5xl">FlowMind</h1>
        <p className="max-w-2xl text-[#1F1F1F]">
          Describe your workflow in plain language and FlowMind will assemble the automation plan.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-colors duration-200 hover:border-[#007AFF]">
          <h2 className="mb-2 text-xl font-semibold text-[#000000]">Workflow Input</h2>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={(event) => {
                if (error) {
                  clearError()
                }
                setInput(event.target.value)
              }}
              onKeyDown={handlePromptKeyDown}
              rows={7}
              placeholder="Example: When a GitHub PR is merged, create a Jira task and post a Slack update."
              className="w-full resize-y rounded-xl border border-[#AFAFAF] bg-[#FFFFFF] px-3 py-2 text-sm text-[#000000] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/35"
            />
            <div className="flex items-center justify-between gap-2 text-xs text-[#1F1F1F]">
              <span>{prompt.trim().length} characters</span>
              <span>Press Cmd/Ctrl + Enter to generate</span>
            </div>
            {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPromptEmpty || isSubmitting} className="bg-[#007AFF] text-[#000000] transition-colors duration-200 hover:bg-[#007AFF]/90">
                {isSubmitting ? 'Generating DAG...' : 'Generate DAG'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || isPromptEmpty}
                onClick={() => {
                  clearError()
                  setInput('')
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-colors duration-200 hover:border-[#007AFF]">
          <h2 className="mb-2 text-xl font-semibold text-[#000000]">Connector Summary</h2>
          <p className="text-sm text-[#1F1F1F]">{connectedCount} connected{errorCount > 0 ? `, ${errorCount} need attention` : ''}.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/connectors" className="inline-flex items-center rounded-md border border-[#AFAFAF] bg-[#FFFFFF] px-3 py-1.5 text-sm font-medium text-[#000000] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#E5E5E5]">
              Manage Connections
            </Link>
            <Link to="/status" className="inline-flex items-center rounded-md border border-[#AFAFAF] bg-[#FFFFFF] px-3 py-1.5 text-sm font-medium text-[#000000] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#E5E5E5]">
              Open Status
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[#1F1F1F]">Quick Start Prompts</p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((quickPrompt) => (
                <button
                  key={quickPrompt}
                  type="button"
                  className="w-full rounded-lg border border-[#AFAFAF] bg-[#FFFFFF] px-3 py-2 text-left text-xs text-[#1F1F1F] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#E5E5E5]"
                  onClick={() => {
                    clearError()
                    setInput(quickPrompt)
                  }}
                >
                  {quickPrompt}
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

export default HomePage
