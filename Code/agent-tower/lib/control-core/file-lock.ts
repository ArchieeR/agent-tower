import { open, stat, unlink } from "node:fs/promises"
import { setTimeout as sleep } from "node:timers/promises"

export async function withFileLock<T>(targetFile: string, operation: () => Promise<T>): Promise<T> {
  const lockFile = `${targetFile}.lock`
  const deadline = Date.now() + 5_000
  let handle
  while (!handle) {
    try {
      handle = await open(lockFile, "wx", 0o600)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      try {
        const lockStat = await stat(lockFile)
        if (Date.now() - lockStat.mtimeMs > 30_000) {
          await unlink(lockFile)
          continue
        }
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError
        continue
      }
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for local control lock: ${targetFile}`)
      await sleep(10)
    }
  }
  try {
    return await operation()
  } finally {
    await handle.close()
    await unlink(lockFile).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    })
  }
}
