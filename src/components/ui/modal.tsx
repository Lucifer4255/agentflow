'use client'

import { Dialog } from '@base-ui/react'
import { cn } from '@/lib/cn'

// ─── Confirm modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-150">
          <Dialog.Title className="mb-1 text-sm font-semibold text-zinc-100">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mb-4 text-xs text-zinc-400">
              {description}
            </Dialog.Description>
          )}
          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              {cancelLabel}
            </Dialog.Close>
            <button
              onClick={() => { onOpenChange(false); onConfirm() }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                destructive
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Name input modal ─────────────────────────────────────────────────────────

interface NameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
}

export function NameModal({
  open,
  onOpenChange,
  title,
  placeholder = 'Untitled',
  value,
  onChange,
  onConfirm,
}: NameModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-150">
          <Dialog.Title className="mb-3 text-sm font-semibold text-zinc-100">
            {title}
          </Dialog.Title>
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onOpenChange(false); onConfirm() }
              if (e.key === 'Escape') onOpenChange(false)
            }}
            placeholder={placeholder}
            className="mb-4 h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none focus:border-sky-500"
          />
          <div className="flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200">
              Cancel
            </Dialog.Close>
            <button
              onClick={() => { onOpenChange(false); onConfirm() }}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
