import { constants, type Stats } from "node:fs"
import { lstat, open, type FileHandle } from "node:fs/promises"
import * as path from "node:path"

import type { BuzzOrganizationCompatibilityTransport } from "./adapter.ts"

const DEFAULT_LIMIT = 1024 * 1024

export type SafeFileOperations = {
  lstat(file: string): Promise<Stats>
  openNoFollow(file: string): Promise<FileHandle>
}
const defaultFileOperations: SafeFileOperations = {
  lstat: (file) => lstat(file),
  openNoFollow: async (file) => {
    if (typeof constants.O_NOFOLLOW !== "number" || constants.O_NOFOLLOW === 0) throw new Error("Safe no-follow file opening is unavailable on this platform.")
    return open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
  },
}

/** Reads only the owner-selected secret-free Buzz export. It never discovers or reads Buzz stores. */
export class BuzzOrganizationCompatibilityFileTransport implements BuzzOrganizationCompatibilityTransport {
  private readonly exportFile: string
  private readonly expectedOwnerUid: number | undefined
  private readonly maxBytes: number
  private readonly files: SafeFileOperations

  constructor(options: { exportFile: string; expectedOwnerUid?: number; maxBytes?: number; fileOperations?: SafeFileOperations }) {
    if (!path.isAbsolute(options.exportFile)) throw new Error("Buzz safe export path must be absolute and explicitly configured.")
    this.exportFile = options.exportFile
    this.expectedOwnerUid = options.expectedOwnerUid ?? (typeof process.getuid === "function" ? process.getuid() : undefined)
    this.maxBytes = Math.min(options.maxBytes ?? DEFAULT_LIMIT, DEFAULT_LIMIT)
    if (!Number.isInteger(this.maxBytes) || this.maxBytes < 1) throw new Error("Buzz safe export size bound is invalid.")
    this.files = options.fileOperations ?? defaultFileOperations
  }

  async getOrganizationCompatibilityPayload(): Promise<unknown> {
    const linkState = await this.files.lstat(this.exportFile)
    if (linkState.isSymbolicLink() || !linkState.isFile() || linkState.size > this.maxBytes) throw new Error("Buzz safe export is not a bounded direct regular file.")
    if (this.expectedOwnerUid !== undefined && linkState.uid !== this.expectedOwnerUid) throw new Error("Buzz safe export owner is invalid.")
    if ((linkState.mode & 0o077) !== 0) throw new Error("Buzz safe export permissions are broader than 0600.")

    const handle = await this.files.openNoFollow(this.exportFile)
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.dev !== linkState.dev || opened.ino !== linkState.ino || opened.size !== linkState.size || opened.mtimeMs !== linkState.mtimeMs || opened.size > this.maxBytes || (this.expectedOwnerUid !== undefined && opened.uid !== this.expectedOwnerUid) || (opened.mode & 0o077) !== 0) throw new Error("Buzz safe export changed during secure open.")
      const buffer = Buffer.allocUnsafe(this.maxBytes + 1)
      let offset = 0
      while (offset <= this.maxBytes) {
        const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset)
        if (bytesRead === 0) break
        offset += bytesRead
      }
      if (offset > this.maxBytes) throw new Error("Buzz safe export exceeds the bounded size.")
      const finalState = await handle.stat()
      if (finalState.dev !== opened.dev || finalState.ino !== opened.ino || finalState.size !== opened.size || finalState.mtimeMs !== opened.mtimeMs || offset !== opened.size || (this.expectedOwnerUid !== undefined && finalState.uid !== this.expectedOwnerUid) || (finalState.mode & 0o077) !== 0) throw new Error("Buzz safe export changed during bounded read.")
      return JSON.parse(buffer.subarray(0, offset).toString("utf8"))
    } finally {
      await handle.close()
    }
  }
}
