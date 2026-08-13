# Agent Tower — Repository Instructions

## Documentation

Durable product/domain/architecture decisions live under `docs/` at this project root.

## Visual implementation

Before creating or modifying UI, spatial, room, avatar, prop, animation or interaction work:

1. Read `docs/05-world/DYNAMIC-ORGANISATION-DIRECTORY-AND-GAME-STATE.md`.
2. Read `docs/02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md` when touching agents, teams or messaging.
3. Use the current generated visual evidence only with its explicit selected/provisional/rejected status.

Project 1 is a local DOM-first Next.js organization surface. The React Three Fiber world is a separate future UI/design workstream and must not be added to Project 1 without a new accepted decision. Dense operational text stays in DOM.

Never read, expose or commit Buzz private keys, auth tags, system prompts, logs or retention databases. A local Buzz adapter must whitelist safe fields.
