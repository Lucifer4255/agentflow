const PISTON_URL = process.env.PISTON_URL

export async function executeCode(
  language: 'python' | 'javascript',
  code: string,
): Promise<string> {
  if (!PISTON_URL) throw new Error('PISTON_URL is not set — deploy a Piston instance and add it to your env')

  const res = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: language === 'javascript' ? 'node' : language,
      version: '*',
      files: [{ content: code }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Piston error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const stdout: string = data.run?.stdout || ''
  const stderr: string = data.run?.stderr || ''
  if (stderr) return `stdout:\n${stdout}\nstderr:\n${stderr}`
  return stdout || 'No output'
}
