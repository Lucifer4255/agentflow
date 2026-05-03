'use client'

import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Dialog } from '@base-ui/react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SignInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultFlow?: 'signIn' | 'signUp'
}

export function SignInModal({ open, onOpenChange, defaultFlow = 'signIn' }: SignInModalProps) {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>(defaultFlow)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn('password', { email, password, flow })
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('InvalidAccountId') || msg.includes('invalid account')) {
        if (flow === 'signIn') {
          setFlow('signUp')
          setError('No account found — switching to sign up. Try again to create your account.')
        } else {
          setError('Account setup failed. Please try again.')
        }
      } else if (msg.includes('InvalidSecret') || msg.includes('invalid secret')) {
        setError('Incorrect password.')
      } else if (msg.includes('AccountAlreadyExists') || msg.includes('already exists')) {
        setFlow('signIn')
        setError('An account already exists with this email — switching to sign in.')
      } else {
        setError(msg || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-150">
          {/* Logo + title */}
          <div className="mb-5 flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-sky-500 to-violet-600" />
            <span className="font-semibold tracking-tight text-zinc-100">AgentFlow</span>
          </div>

          <Dialog.Title className="mb-1 text-[15px] font-semibold text-zinc-100">
            {flow === 'signIn' ? 'Welcome back' : 'Create an account'}
          </Dialog.Title>
          <p className="mb-5 text-[13px] text-zinc-500">
            {flow === 'signIn' ? 'Sign in to save and manage your workflows.' : 'Get started for free — no credit card required.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-sky-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-sky-500"
            />

            {error && (
              <p className="rounded-md bg-red-950/60 px-3 py-2 text-[12px] text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition',
                loading
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-sky-600 text-white hover:bg-sky-500',
              )}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {flow === 'signIn' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-zinc-500">
            {flow === 'signIn' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setFlow(flow === 'signIn' ? 'signUp' : 'signIn'); setError('') }}
              className="text-sky-400 hover:text-sky-300"
            >
              {flow === 'signIn' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
