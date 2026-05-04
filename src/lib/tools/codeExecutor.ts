import { Sandbox } from 'e2b'

export async function executeCode(
  language: 'python' | 'javascript',
  code: string,
): Promise<string> {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) throw new Error('E2B_API_KEY is not set')

  const sandbox = await Sandbox.create({ apiKey })
  try {
    if (language === 'python') {
      await sandbox.files.write('/tmp/script.py', code)
      const result = await sandbox.commands.run('python3 /tmp/script.py')
      if (result.stderr) return `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      return result.stdout || 'No output'
    } else {
      await sandbox.files.write('/tmp/script.mjs', code)
      const result = await sandbox.commands.run('node /tmp/script.mjs')
      if (result.stderr) return `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      return result.stdout || 'No output'
    }
  } finally {
    await sandbox.kill()
  }
}
