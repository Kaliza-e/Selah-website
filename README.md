# Selah Website

Marketing and download landing page for the **Selah** desktop planner application (`daylight-desktop`).

## Local Development

```bash
cd website
npm install
npm run dev
```

## Production Build

```bash
cd website
npm run build
```

Output is generated in `website/dist/`.

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, import the repository and set **Root Directory** to `website`.
3. Framework preset is **Vite** (`npm run build`, output directory `dist`).
4. Deploy. Download buttons automatically query the latest GitHub Release assets for `Kaliza-e/Hello_118_24`.

