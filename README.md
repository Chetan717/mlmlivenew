# MLM LIVE — Frontend

A mobile-first React + Vite app for creating, customizing, and sharing branded
marketing images. This package contains **only the frontend UI** (React + Vite),
with no backend mixed in.

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
```

## Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable               | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key for subscription flow |

Firebase configuration lives in `src/Firebase.js`. Update it with your own
Firebase project credentials if needed.

## Run in development

```bash
npm run dev
```

Opens the app on http://localhost:5173 with hot reload.

## Build for production

```bash
npm run build
```

Outputs the static site to the `dist/` folder.

## Start (serve the production build)

```bash
npm start
```

Serves the contents of `dist/` on http://localhost:5173.
Run `npm run build` first.

## Notes

- The AI image touch-up feature in the editor calls a backend endpoint at
  `/api/ai/retouch`. That backend is **not** included in this frontend-only
  package, so the AI button will only work if you serve a compatible API at that
  path (for example, via a reverse proxy). Every other feature runs entirely in
  the frontend.
- Tech stack: React 19, Vite 7, Tailwind CSS v4, HeroUI v3, Firebase,
  react-router v7, react-konva, framer-motion, Swiper.
