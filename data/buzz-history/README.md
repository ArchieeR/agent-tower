# Buzz JSON History

This directory stores reversible snapshots for explicitly approved experiments against Buzz Desktop's local JSON stores.

## Rules

- Stop Buzz before writing.
- Copy the exact pre-write bytes into a timestamped `before.json`.
- Validate the complete document before replacement.
- Write to a same-directory temporary file and atomically rename it.
- Reopen Buzz, verify the live hash and parse the file again.
- Preserve `after.json` and `manifest.json` with SHA-256 hashes and a rollback path.
- Never store Buzz private keys, auth tags, system prompts, logs or retention data here.

## Current experiment

`teams/20260809T111343Z/` records the creation of eight empty custom Agent Tower teams while preserving Buzz's built-in Welcome Team.

The live file survived Buzz restart unchanged and was read back through Agent Tower's whitelisted adapter as eight custom teams. Fizz, Honey and Bumble are excluded from Agent Tower through `Code/agent-tower/data/organization-overrides.json`; their protected Buzz built-ins were not deleted.

`teams/20260809T120018Z/` records the later removal of the empty Creative and Strategy teams. Buzz again retained the exact after-hash following restart, leaving six custom Agent Tower teams plus the preserved built-in Welcome Team.
