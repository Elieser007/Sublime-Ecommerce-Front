## Worktree Agent Setup

This project uses Git worktrees for parallel agent work. Each agent has isolated ports.

### IMPORTANT: Start your servers FIRST

Before doing ANY work, you MUST start your backend and frontend servers.

1. Run `./start.sh` from the worktree root (parent of this directory)
2. The script reads `.agent-env` for your port assignments
3. Backend runs on the port specified in `.agent-env`
4. Frontend runs on the port specified in `.agent-env`

### Your ports

Check `.agent-env` in the worktree root for your specific ports. Do NOT guess ports.

### Verify servers are running

After starting, verify with:
- Backend: `curl -s http://localhost:YOUR_BACK_PORT/` should return 200
- Frontend: `curl -s http://localhost:YOUR_FRONT_PORT/` should return 200

If ports conflict with other agents, something is wrong. Check `.agent-env`.

# AGENTS.md — Sublime E-commerce Frontend

## Stack

- **Framework**: Astro 7.x (SSG mode)
- **Adapter**: @astrojs/cloudflare (Cloudflare Pages)
- **Language**: TypeScript (strict)
- **Testing**: vitest
- **Package manager**: npm

## Commands

```bash
npm run dev      # Astro dev server (localhost:4321)
npm test         # vitest run
npm run build    # static output to dist/
npm run preview  # preview production build
```

## Folder Structure

```
src/
├── pages/          # SSG routes (file-based routing)
├── components/     # Astro components
├── layouts/        # Page layouts
├── lib/            # Client-side JS utilities
│   ├── cart.ts     # Cart logic (LocalStorage)
│   ├── image.ts    # Image processing (canvas → WebP)
│   └── whatsapp.ts # WhatsApp URL generation
├── styles/         # Global styles
└── index.astro     # Homepage
public/             # Static assets (served as-is)
```

## Key Rules

1. **SSG only** — no server-side rendering. All pages compile at build time.
2. **Client-side JS** — cart, image processing, and WhatsApp link run in the browser via `<script>` tags.
3. **Images** — process with `<canvas>` API (resize ≤1000×1000, WebP 80%) before uploading to backend.
4. **No backend calls in public pages** — the catalog is static. Backend calls only in admin panel.

## Testing

- Test files: `src/**/*.test.ts`
- Run: `npm test`
- TDD: RED → GREEN → TRIANGULATE → REFACTOR

## Deployment

Cloudflare Pages auto-deploys from this repo's `main` branch.
Build command: `npm run build`
Output directory: `dist/`
