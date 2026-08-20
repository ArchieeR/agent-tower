#!/usr/bin/env node

import { fileURLToPath } from "node:url"

import { isAdapterCliCommand, runAdapterCli } from "../lib/adapters/cli.ts"
import { runCli } from "../lib/control-core/cli.ts"

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "")

void (async () => {
  try {
    const args = process.argv.slice(2)
    process.exitCode = isAdapterCliCommand(args)
      ? await runAdapterCli(args, { projectRoot })
      : await runCli(args, { projectRoot })
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Agent Tower command failed."}\n`)
    process.exitCode = 1
  }
})()
