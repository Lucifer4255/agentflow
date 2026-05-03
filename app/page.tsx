'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useConvexAuth } from 'convex/react'
import { SignInModal } from '@/components/auth/SignInModal'

const PAPER = '#ede5d0'
const INK = '#1a1814'
const RUST = '#9a3412'

export default function LandingPage() {
  const { isAuthenticated } = useConvexAuth()
  const [signInOpen, setSignInOpen] = useState(false)

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{
        backgroundColor: PAPER,
        color: INK,
        fontFamily: 'var(--font-geist-sans)',
        backgroundImage: `
          linear-gradient(to right, rgba(26,24,20,0.045) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(26,24,20,0.045) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
      }}
    >
      <PageStyles />

      {/* Subtle paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 border-b border-[var(--ink-15)]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em]">
            <Mark />
            <span className="font-semibold">AgentFlow</span>
            <span className="hidden text-[var(--ink-50)] sm:inline">Est. 2026</span>
          </div>
          <nav className="flex items-center gap-7 font-mono text-[10px] uppercase tracking-[0.22em]">
            <a href="#how" className="hidden transition hover:text-[var(--rust)] md:inline">
              How it works
            </a>
            <a href="#why" className="hidden transition hover:text-[var(--rust)] md:inline">
              Specs
            </a>
            {!isAuthenticated ? (
              <button onClick={() => setSignInOpen(true)} className="transition hover:text-[var(--rust)]">Sign in</button>
            ) : (
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 border border-[var(--ink)] px-3 py-2 transition hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              >
                Open studio <span aria-hidden>→</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-16 px-8 pt-24 pb-32 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="reveal mb-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ink-60)]">
              <span className="block h-px w-10 bg-[var(--ink-40)]" />
              Fig. 00 — A new way to ship chat
            </div>

            <h1
              className="font-medium leading-[0.94] tracking-[-0.025em]"
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: 'clamp(3rem, 7.4vw, 6.6rem)',
                fontFeatureSettings: '"ss01", "ss02"',
              }}
            >
              <span className="reveal block" style={{ animationDelay: '0.05s' }}>
                Draft an AI
              </span>
              <span className="reveal block" style={{ animationDelay: '0.18s' }}>
                chat app
              </span>
              <span
                className="reveal block font-light italic"
                style={{
                  fontFamily: 'var(--font-newsreader)',
                  color: RUST,
                  animationDelay: '0.32s',
                }}
              >
                in an afternoon.
              </span>
            </h1>

            <p
              className="reveal mt-10 max-w-xl text-[1.075rem] leading-[1.65] text-[var(--ink-75)]"
              style={{ animationDelay: '0.5s' }}
            >
              AgentFlow is a visual workbench for businesses that want to ship
              production-grade AI chat —{' '}
              <em
                className="font-light italic"
                style={{ fontFamily: 'var(--font-newsreader)' }}
              >
                without
              </em>{' '}
              hiring a frontend team, babysitting a backend, or rewriting their prompts in code.
            </p>

            <div
              className="reveal mt-12 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '0.65s' }}
            >
              <button onClick={() => setSignInOpen(true)} className="group relative inline-flex items-center gap-3 bg-[var(--ink)] px-8 py-4 text-sm font-medium text-[var(--paper)] transition hover:bg-[var(--rust)]">
                <span>Start drafting</span>
                <span className="font-mono text-xs opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                  ↗
                </span>
              </button>
              <Link
                href="/builder"
                className="group inline-flex items-center gap-3 border border-[var(--ink-30)] px-8 py-4 text-sm font-medium transition hover:border-[var(--ink)]"
              >
                <span>See a live workflow</span>
                <span className="font-mono text-xs transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            <div
              className="reveal mt-16 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-50)]"
              style={{ animationDelay: '0.8s' }}
            >
              <span>No card</span>
              <span className="h-px w-4 bg-[var(--ink-30)]" />
              <span>No SDKs to learn</span>
              <span className="h-px w-4 bg-[var(--ink-30)]" />
              <span>Ship in a week</span>
            </div>
          </div>

          {/* Schematic */}
          <div className="lg:col-span-5">
            <div className="reveal-slow" style={{ animationDelay: '0.55s' }}>
              <Schematic />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 border-t border-[var(--ink-15)]">
        <div className="mx-auto max-w-[1240px] px-8 py-28">
          <div className="mb-20 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ink-60)]">
                <span className="block h-px w-10 bg-[var(--ink-40)]" />
                Fig. 01 — Process
              </div>
              <h2
                className="font-medium leading-[1] tracking-[-0.022em]"
                style={{
                  fontFamily: 'var(--font-fraunces)',
                  fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)',
                }}
              >
                From sketch to ship,
                <br />
                <span
                  className="font-light italic"
                  style={{ fontFamily: 'var(--font-newsreader)', color: RUST }}
                >
                  three steps.
                </span>
              </h2>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-40)]">
              Scale 1:1 / Not to time
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <Step
              n="01"
              title="Draft"
              body="Drag input, agent, and tool nodes onto the canvas. Wire them like a flowchart. No SDK. No boilerplate."
            />
            <Step
              n="02"
              title="Tune"
              body="Edit prompts, swap models, plug in your APIs. Run the graph and watch every node light up in real time."
            />
            <Step
              n="03"
              title="Ship"
              body="One click publishes your workflow as a chat app — embeddable, hosted, or piped into Slack. Customers don't see the wires."
            />
          </div>
        </div>
      </section>

      {/* Specs / Why */}
      <section id="why" className="relative z-10 border-t border-[var(--ink-15)]">
        <div className="mx-auto max-w-[1240px] px-8 py-28">
          <div className="mb-16 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ink-60)]">
            <span className="block h-px w-10 bg-[var(--ink-40)]" />
            Fig. 02 — Specifications
          </div>

          <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-12">
            <h3
              className="font-medium leading-[1.05] tracking-[-0.022em] md:col-span-5"
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: 'clamp(2rem, 3.4vw, 2.75rem)',
              }}
            >
              Engineering rigor,
              <br />
              <span
                className="font-light italic"
                style={{ fontFamily: 'var(--font-newsreader)', color: RUST }}
              >
                for the rest of us.
              </span>
            </h3>
            <div className="space-y-10 md:col-span-7">
              <Spec
                label="Built for business, not for builders"
                body="Your PM can ship. Your support lead can ship. The visual canvas is the source of truth — engineers stay free to do real engineering."
              />
              <Spec
                label="Production from day one"
                body="Streaming, tool calls, MCP servers, multi-turn memory, cost tracking — every workflow you draft is wired with the same primitives an engineering team would build by hand."
              />
              <Spec
                label="Yours, not ours"
                body="Bring your own model keys. Your prompts and your data stay yours. Export the workflow whenever you outgrow the canvas."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-[var(--ink-15)]">
        <div className="mx-auto max-w-[1240px] px-8 py-32 text-center">
          <div className="mb-5 flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ink-60)]">
            <span className="block h-px w-10 bg-[var(--ink-40)]" />
            Fig. 03 — Begin
            <span className="block h-px w-10 bg-[var(--ink-40)]" />
          </div>
          <h2
            className="font-medium leading-[0.96] tracking-[-0.025em]"
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: 'clamp(2.75rem, 6vw, 5.25rem)',
            }}
          >
            Lay the foundation
            <br />
            <span
              className="font-light italic"
              style={{ fontFamily: 'var(--font-newsreader)', color: RUST }}
            >
              this afternoon.
            </span>
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setSignInOpen(true)} className="group inline-flex items-center gap-3 bg-[var(--ink)] px-10 py-5 text-sm font-medium text-[var(--paper)] transition hover:bg-[var(--rust)]">
              <span>Start drafting</span>
              <span className="font-mono text-xs opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                ↗
              </span>
            </button>
            <Link
              href="/builder"
              className="group inline-flex items-center gap-3 border border-[var(--ink-30)] px-10 py-5 text-sm font-medium transition hover:border-[var(--ink)]"
            >
              <span>Open the canvas</span>
              <span className="font-mono text-xs transition group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--ink-15)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-8 py-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-50)]">
          <span>© 2026 AgentFlow · Drawn by hand, run by code</span>
          <span>Sheet 1 of 1</span>
        </div>
      </footer>

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  )
}

function PageStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --paper: ${PAPER};
        --ink: ${INK};
        --rust: ${RUST};
        --ink-15: rgba(26, 24, 20, 0.15);
        --ink-30: rgba(26, 24, 20, 0.3);
        --ink-40: rgba(26, 24, 20, 0.4);
        --ink-50: rgba(26, 24, 20, 0.55);
        --ink-60: rgba(26, 24, 20, 0.62);
        --ink-75: rgba(26, 24, 20, 0.78);
      }
      .font-mono {
        font-family: var(--font-geist-mono), ui-monospace, monospace;
      }
      @keyframes reveal {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes revealSlow {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .reveal {
        opacity: 0;
        animation: reveal 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .reveal-slow {
        opacity: 0;
        animation: revealSlow 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @keyframes drawIn {
        to {
          stroke-dashoffset: 0;
        }
      }
      .schematic-line {
        stroke-dasharray: 600;
        stroke-dashoffset: 600;
        animation: drawIn 1.6s 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
      }
    ` }} />
  )
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="1" y="1" width="20" height="20" stroke={INK} strokeWidth="1" fill="none" />
      <line x1="1" y1="1" x2="21" y2="21" stroke={INK} strokeWidth="1" />
      <circle cx="11" cy="11" r="3" stroke={RUST} strokeWidth="1.2" fill={PAPER} />
    </svg>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-t border-[var(--ink-30)] pt-7">
      <div className="mb-7 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ink-60)]">
        <span>Step {n}</span>
        <span className="text-[var(--ink-40)]">/ 03</span>
      </div>
      <h3
        className="font-medium tracking-[-0.022em]"
        style={{ fontFamily: 'var(--font-fraunces)', fontSize: '2rem' }}
      >
        {title}
      </h3>
      <p className="mt-4 text-[0.975rem] leading-[1.6] text-[var(--ink-75)]">{body}</p>
    </div>
  )
}

function Spec({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-t border-[var(--ink-30)] pt-5">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ink-60)]">
        {label}
      </div>
      <p
        className="text-[1.15rem] leading-[1.55]"
        style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 400 }}
      >
        {body}
      </p>
    </div>
  )
}

function Schematic() {
  return (
    <div className="relative aspect-[4/5] w-full max-w-[440px] mx-auto">
      <svg
        viewBox="0 0 400 540"
        className="h-full w-full"
        fill="none"
        stroke={INK}
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        {/* Frame corner brackets */}
        <g strokeWidth="0.6" opacity="0.42">
          <path d="M 4 4 L 22 4 M 4 4 L 4 22" />
          <path d="M 396 4 L 378 4 M 396 4 L 396 22" />
          <path d="M 4 536 L 22 536 M 4 536 L 4 518" />
          <path d="M 396 536 L 378 536 M 396 536 L 396 518" />
        </g>

        {/* Header annotation */}
        <text x="40" y="28" fontSize="8" fill={INK} opacity="0.62" letterSpacing="2">
          SCHEMATIC / WORKFLOW.001
        </text>
        <text
          x="360"
          y="28"
          fontSize="8"
          fill={INK}
          opacity="0.42"
          letterSpacing="2"
          textAnchor="end"
        >
          REV. 01
        </text>

        {/* Left dimension marks */}
        <g strokeWidth="0.4" opacity="0.32">
          {Array.from({ length: 22 }).map((_, i) => (
            <line key={i} x1="14" y1={70 + i * 20} x2="20" y2={70 + i * 20} />
          ))}
          <line x1="17" y1="70" x2="17" y2="500" />
        </g>

        {/* Connection lines (drawn first so they sit under boxes) */}
        <g strokeWidth="0.85" stroke={INK}>
          <path className="schematic-line" d="M 200 124 V 156 H 110 V 188" />
          <path className="schematic-line" d="M 200 124 V 156 H 290 V 188" />
          <path className="schematic-line" d="M 110 240 V 280 H 200 V 308" />
          <path className="schematic-line" d="M 290 240 V 280 H 200 V 308" />
          <path className="schematic-line" d="M 200 354 V 408" />
        </g>

        {/* Junction dots */}
        <circle cx="200" cy="156" r="2.4" fill={INK} />
        <circle cx="200" cy="280" r="2.4" fill={INK} />

        {/* Arrowhead into OUTPUT */}
        <path d="M 195 402 L 200 412 L 205 402" stroke={INK} strokeWidth="0.85" fill="none" />

        {/* INPUT */}
        <g>
          <rect x="140" y="80" width="120" height="44" stroke={INK} strokeWidth="1" fill={PAPER} />
          <text x="200" y="100" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill={INK}>
            INPUT
          </text>
          <text
            x="200"
            y="115"
            textAnchor="middle"
            fontSize="8"
            fill={INK}
            opacity="0.55"
            fontFamily="var(--font-geist-sans)"
          >
            user prompt
          </text>
        </g>
        <g>
          <circle cx="278" cy="102" r="9" stroke={RUST} strokeWidth="0.9" fill={PAPER} />
          <text x="278" y="105.5" textAnchor="middle" fontSize="9" fill={RUST}>
            1
          </text>
        </g>

        {/* AGENT 1 */}
        <g>
          <rect x="55" y="190" width="110" height="50" stroke={INK} strokeWidth="1" fill={PAPER} />
          <text x="110" y="211" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill={INK}>
            AGENT
          </text>
          <text
            x="110"
            y="227"
            textAnchor="middle"
            fontSize="8"
            fill={INK}
            opacity="0.55"
            fontFamily="var(--font-geist-sans)"
          >
            classify intent
          </text>
        </g>

        {/* AGENT 2 */}
        <g>
          <rect x="235" y="190" width="110" height="50" stroke={INK} strokeWidth="1" fill={PAPER} />
          <text x="290" y="211" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill={INK}>
            AGENT
          </text>
          <text
            x="290"
            y="227"
            textAnchor="middle"
            fontSize="8"
            fill={INK}
            opacity="0.55"
            fontFamily="var(--font-geist-sans)"
          >
            retrieve context
          </text>
        </g>

        {/* TOOL */}
        <g>
          <rect x="140" y="310" width="120" height="44" stroke={INK} strokeWidth="1" fill={PAPER} />
          <text x="200" y="330" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill={INK}>
            TOOL
          </text>
          <text
            x="200"
            y="345"
            textAnchor="middle"
            fontSize="8"
            fill={INK}
            opacity="0.55"
            fontFamily="var(--font-geist-sans)"
          >
            api · mcp
          </text>
        </g>
        <g>
          <circle cx="278" cy="332" r="9" stroke={RUST} strokeWidth="0.9" fill={PAPER} />
          <text x="278" y="335.5" textAnchor="middle" fontSize="9" fill={RUST}>
            2
          </text>
        </g>

        {/* OUTPUT (rust accent) */}
        <g>
          <rect x="140" y="412" width="120" height="46" stroke={RUST} strokeWidth="1.2" fill={PAPER} />
          <text x="200" y="433" textAnchor="middle" fontSize="9" letterSpacing="2.4" fill={RUST}>
            OUTPUT
          </text>
          <text
            x="200"
            y="448"
            textAnchor="middle"
            fontSize="8"
            fill={INK}
            opacity="0.55"
            fontFamily="var(--font-geist-sans)"
          >
            chat reply, streamed
          </text>
        </g>
        <g>
          <circle cx="278" cy="435" r="9" stroke={RUST} strokeWidth="0.9" fill={RUST} />
          <text x="278" y="438.5" textAnchor="middle" fontSize="9" fill={PAPER}>
            3
          </text>
        </g>

        {/* Right dimension line */}
        <g strokeWidth="0.4" opacity="0.42">
          <line x1="376" y1="80" x2="376" y2="458" />
          <line x1="372" y1="80" x2="380" y2="80" />
          <line x1="372" y1="458" x2="380" y2="458" />
        </g>
        <text
          x="382"
          y="270"
          fontSize="7.5"
          fill={INK}
          opacity="0.5"
          letterSpacing="1.6"
          transform="rotate(-90 382 270)"
          textAnchor="middle"
        >
          5 NODES · 1 GRAPH
        </text>

        {/* Title block */}
        <line x1="20" y1="488" x2="380" y2="488" strokeWidth="0.5" opacity="0.35" />
        <line x1="140" y1="488" x2="140" y2="525" strokeWidth="0.5" opacity="0.35" />
        <line x1="270" y1="488" x2="270" y2="525" strokeWidth="0.5" opacity="0.35" />
        <line x1="20" y1="506" x2="380" y2="506" strokeWidth="0.4" opacity="0.25" />

        <g fontSize="7" fill={INK} opacity="0.6" letterSpacing="2">
          <text x="28" y="500">DRAWN BY</text>
          <text x="148" y="500">SCALE</text>
          <text x="278" y="500">SHEET</text>
        </g>
        <g fontSize="8" fill={INK} letterSpacing="1.5">
          <text x="28" y="520">YOU</text>
          <text x="148" y="520">1:1</text>
          <text x="278" y="520">1 / 1</text>
        </g>
      </svg>
    </div>
  )
}
