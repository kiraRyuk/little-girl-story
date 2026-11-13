# Vercel deployment

The site is a static Astro application. `vercel.json` specifies:

| Setting | Value |
| --- | --- |
| Framework | Astro |
| Install command | `npm ci --no-audit --no-fund` |
| Build command | `npm run build` |
| Output directory | `dist` |

Keep `package-lock.json` alongside `package.json`. No server adapter, server functions, rewrite rules, runtime secrets or narration service is needed. Vercel builds on its cloud machines; this does not install dependencies on the legacy MacBook.

## Connection status

This folder has a local Git repository with origin `https://github.com/kiraRyuk/little-girl-story.git`. There is no `.vercel/project.json` link, and the Vercel CLI is not installed. The GitHub push has not been verified from the network-restricted Codex session. Creating these configuration files does not create a Vercel account/project or publish a deployment. Account connection remains required.

## Dashboard route (no local CLI installation)

1. Put this application folder in your own GitHub, GitLab or Bitbucket repository and push it using your authenticated account. Include source, public artwork, `package.json`, `package-lock.json`, `astro.config.mjs` and `vercel.json`; exclude `node_modules`, `dist`, `.astro` and `.vercel` as specified by `.gitignore`.
2. In the Vercel dashboard, choose Add New → Project and import that repository.
3. Set Root Directory to `.` if the repository contains this application's files directly. If the repository contains the enclosing workspace, set it to `onecoldnight-story` instead.
4. Confirm the build settings above, choose a supported Node.js version that meets the existing Astro engine requirement, and deploy. Node.js 24 is the version already exercised locally; confirm it is available in your Vercel project settings.
5. Check the resulting URL: entry screen, opening/closing book, slow/reverse scrolling, caption transitions, optional ambience, mobile layout and no unexpected narration. Browser WebGL compatibility still matters on the visitor's device.

## CLI route

A project-local Vercel CLI download/install and account login require explicit user approval before proceeding. Do not run `npx vercel` implicitly: it downloads a runtime package. No CLI has been installed, credentials read or project linked as part of the configuration preparation.

Once authorized, inspect the exact official CLI version and any native dependencies for compatibility before using it on this machine. Existing Codex sandbox DNS restrictions may require an approved host-Konsole workflow for package retrieval/login/deployment; do not bypass restrictions.

## Upload exclusions and future changes

`.vercelignore` excludes local generated output, dependency folders, development-only docs/tests/scripts, secrets and the unused draft eSpeak recordings. The running app no longer imports those recordings. If narration is deliberately re-enabled later, update that exclusion so the selected original audio files are available at build time. The current public character artwork remains included.

`.vercel/` is ignored by Git because it is a local project/account link. No authenticated link has been created. The previous `.gitignore` was copied to `/tmp/onecoldnight-vercel-config-20261113T111446Z-0qtxz9zm/.gitignore`, and its SHA-256 was verified before editing. Existing build output and earlier verification evidence were preserved.

Official references:

- https://vercel.com/docs/frameworks/frontend/astro
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/builds/configure-a-build
