import { open, stat } from "node:fs/promises"
import * as path from "node:path"

import type { BuzzSafeExportTransport } from "./adapter.ts"

const DEFAULT_LIMIT = 1024 * 1024

/** Reads only the owner-selected secret-free Buzz export. It never discovers or reads Buzz stores. */
export class BuzzSafeExportFileTransport implements BuzzSafeExportTransport {
  private readonly exportFile: string
  private readonly expectedOwnerUid: number | undefined
  private readonly maxBytes: number

  constructor(options: { exportFile: string; expectedOwnerUid?: number; maxBytes?: number }) {
    if (!path.isAbsolute(options.exportFile)) throw new Error("Buzz safe export path must be absolute and explicitly configured.")
    this.exportFile = options.exportFile
    this.expectedOwnerUid = options.expectedOwnerUid ?? (typeof process.getuid === "function" ? process.getuid() : undefined)
    this.maxBytes = Math.min(options.maxBytes ?? DEFAULT_LIMIT, DEFAULT_LIMIT)
  }

  async getOrganizationExport(): Promise<unknown> {
    const linkState = await stat(this.exportFile, { bigint: false })
    if (!linkState.isFile() || linkState.size > this.maxBytes) throw new Error("Buzz safe export is not a bounded regular file.")
    if (this.expectedOwnerUid !== undefined && linkState.uid !== this.expectedOwnerUid) throw new Error("Buzz safe export owner is invalid.")
    if ((linkState.mode & 0o077) !== 0) throw new Error("Buzz safe export permissions are broader than 0600.")

    const handle = await open(this.exportFile, "r")
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.dev !== linkState.dev || opened.ino !== linkState.ino || opened.size !== linkState.size || opened.size > this.maxBytes) throw new Error("Buzz safe export changed during secure open.")
      const content = await handle.readFile({ encoding: "utf8" })
      if (Buffer.byteLength(content) > this.maxBytes) throw new Error("Buzz safe export exceeds the bounded size.")
      return JSON.parse(content)
    } finally {
      await handle.close()
    }
  }
}
