#!/usr/bin/env node

import { fileURLToPath } from "node:url"

import { runCli } from "../lib/control-core/cli.ts"

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "")

try {
  process.exitCode = await runCli(process.argv.slice(2), { projectRoot })
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Agent Tower command failed."}\n`)
  process.exitCode = 1
}
