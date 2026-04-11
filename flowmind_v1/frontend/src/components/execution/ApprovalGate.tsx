import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { logStepApproved, logStepRejected } from '@/lib/logger'
import { approveStep } from '@/services/execution.service'
import { useExecutionStore } from '@/store/execution.store'

function ApprovalGate() {
  const executionId = useExecutionStore((state) => state.executionId)
  const stepId = useExecutionStore((state) => state.pendingApprovalStepId)
  const [inFlight, setInFlight] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!executionId || !stepId) {
    return null
  }

  const submitDecision = async (approved: boolean): Promise<void> => {
    setError(null)
    setInFlight(approved ? 'approve' : 'reject')

    try {
      await approveStep({ executionId, stepId, approved })
      if (approved) {
        logStepApproved({ executionId, stepId })
      } else {
        logStepRejected({ executionId, stepId })
      }
      useExecutionStore.setState({ isPaused: false, isRunning: true })
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('Unable to submit approval right now.')
      }
    } finally {
      setInFlight(null)
    }
  }

  return (
    <section className="rounded-2xl border border-[#D97706] bg-[#FFF4D6] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-6">
      <h2 className="text-xl font-semibold text-[#7C2D12]">Execution Paused For Approval</h2>
      <p className="mt-1 text-sm text-[#92400E]">Review step {stepId} and choose to continue or fail the run.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          className="h-12 min-w-32 bg-[#16A34A] px-8 text-base font-semibold text-[#FFFFFF] transition-colors duration-200 hover:bg-[#15803D]"
          disabled={inFlight !== null}
          onClick={() => void submitDecision(true)}
        >
          {inFlight === 'approve' ? 'Submitting...' : 'APPROVE'}
        </Button>
        <Button
          className="h-12 min-w-32 bg-[#DC2626] px-8 text-base font-semibold text-[#FFFFFF] transition-colors duration-200 hover:bg-[#B91C1C]"
          disabled={inFlight !== null}
          onClick={() => void submitDecision(false)}
        >
          {inFlight === 'reject' ? 'Submitting...' : 'REJECT'}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-[#B42318]">{error}</p> : null}
    </section>
  )
}

export default ApprovalGate
