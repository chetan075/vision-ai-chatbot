# Vision Angular Chatbot

A local Angular + Tailwind front-end with a small Node proxy server for AI chat. The project provides a modern dark-themed landing page and a Gemini-inspired chat UI.

## Key features

- Dark, professional landing page inspired by Outskill
- Gemini-style chat UI: sidebar (sessions) + main chat area
- Message formatting support (simple markdown-like rendering)
- Streaming-capable server proxy to an AI model (configurable)
- Tailwind utilities and custom CSS for theme control

## Tech stack

- Frontend: Angular (CLI), TailwindCSS, TypeScript
- Backend: Node.js (simple proxy in `server/index.js`) to call AI provider

## Repo structure (important files)

- `src/app/landing/` — landing page component and styles
- `src/app/chat/` — chat component, template and styles
- `src/styles.css` — global theme variables and utilities
- `server/index.js` — backend proxy to AI API
- `server/.env` — environment variables used by the server (not checked in)

## Prerequisites

- Node.js (>=14) and npm
- Angular CLI (optional, for `ng` commands)

## Setup (development)

1. Install dependencies for frontend:

   npm install

2. Install server dependencies and configure env (in `server/`):

   cd server
   npm install

   Create `server/.env` with keys (example):

   AI_API_KEY=your_api_key_here
   AI_MODEL=gemini-1.5-flash
   PORT=3000

   Note: Use the AI model name supported by your account. `gemini-1.5-flash` is a common fallback.

3. Run server (in `server/`):

   npm start

4. Run frontend (from project root):

   ng serve

   Or if you prefer npm script:

   npm run start:frontend

Open http://localhost:4200/ (frontend) and ensure the server proxy is running on the port configured in `server/.env`.

## Build for production

- Build frontend:

  ng build --prod

- Start or deploy the server separately; ensure the server points to the correct built assets or serve the frontend from your static host.

## Important customization points

- Theme colors and variables: `src/styles.css` (change `--gradient-bg`, accent colors etc.)
- Landing page: `src/app/landing/landing.component.html` and `.css`
- Chat behavior & formatting: `src/app/chat/chat.component.ts` and `formatMessage` helper
- Add assets in `src/assets/` and update paths used in templates

## Common issues & troubleshooting

- Angular template ICU/parse errors: these usually come from unescaped curly braces or illegal class bindings. Avoid raw class names with `/` inside property bindings (e.g. use a safe CSS class like `.bg-white-10`).
- "Property ... does not exist": ensure component class defines the referenced properties and that you restarted the dev server after making TypeScript changes.
- 404 from AI provider: check `AI_MODEL` and `AI_API_KEY` in `server/.env`. Some experimental models may not be available.
- If HMR or caching shows stale template errors, stop the dev server and restart after clearing the cache.

## Tests & CI

No tests are included by default. Add unit/e2e tests using Angular testing tools (`karma`, `jest`, or `cypress`) as needed.

## Contribution

Contributions welcome. Create branches, open PRs, and include a short description of the change. For big UI changes, include screenshots.

## License

Choose a license for your project (MIT, Apache-2.0, etc.).

---

If you want, I can:
- Add a sample `server/.env.example` file
- Add npm scripts to start frontend + server together
- Create a deployable static build + server integration

Tell me which next step you want.
