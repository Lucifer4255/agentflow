export async function executeCode(
    language: 'python' | 'javascript',
    code: string,
  ): Promise<string> {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version: '*',
        files: [{ content: code }],
      }),
    })
  
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Piston error ${response.status}: ${text}`)
    }
  
    const data = await response.json()
    const stdout = data.run?.stdout || ''
    const stderr = data.run?.stderr || ''
  
    if (stderr) return `stdout:\n${stdout}\nstderr:\n${stderr}`
    return stdout || 'No output'
  }
  