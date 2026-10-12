# bchat frontend

## Deploy to Vercel

Import this repository into Vercel and set the project **Root Directory** to `frontend`.
Vercel will use `npm install`, `npm run build`, and the `dist` output directory from
`vercel.json`. The rewrite there keeps React Router routes working on direct visits.

Add this project environment variable in Vercel for each deployment environment:

```text
VITE_API_URL=https://your-deployed-backend.example.com
```

Use the backend's public HTTPS origin without a trailing slash. The backend must be
deployed separately; set its `CORS_ORIGINS` environment variable to the frontend's
Vercel domain if you want to restrict cross-origin requests to that domain. The
backend also accepts `*.vercel.app` origins by default.

For password reset emails, configure the backend's `FRONTEND_URL` to the deployed
frontend origin so links open on Vercel.

## Local development

Run `npm install` and `npm run dev` from this directory. Without `VITE_API_URL`,
the frontend connects to `http://127.0.0.1:8000`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
