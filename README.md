# Agent Tower

Agent Tower is a local organization and capability-control surface for human and AI teams. Buzz supplies the desktop/messaging/runtime substrate; Agent Tower owns the organization model, department capability policy, versioned runtime context and execution evidence.

## Repository layout

- `Code/agent-tower/` — local Next.js organization/control-plane application
- `docs/` — canonical product, domain, architecture and programme decisions
- `sketches/` — visual design evidence and approved/provisional concept work
- `data/` — bounded integration evidence
- `Code/buzz/` — separate downstream Buzz Git repository, intentionally excluded here
- `artifacts/` — local packaged builds, intentionally excluded here

## Start here

- [`docs/README.md`](docs/README.md)
- [`docs/00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md`](docs/00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md)
- [`docs/02-architecture/BUZZ-AGENT-DEPARTMENT-CAPABILITY-MATRIX.md`](docs/02-architecture/BUZZ-AGENT-DEPARTMENT-CAPABILITY-MATRIX.md)

## Local verification

```bash
cd Code/agent-tower
npm install
npm test
npm run build
```

The application is local-first. Never commit Buzz private keys, auth tags, raw system prompts, credential files, unrestricted logs or provider secrets.
