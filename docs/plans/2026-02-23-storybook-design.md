# Storybook Design

## Goal

Add Storybook as both a development sandbox and public documentation site for `@tstephx/api-dashboard`.

## Approach

**Option A — API URL as a story arg**

Each story exposes `apiUrl` as a configurable arg in the Storybook Controls panel. Developers point it at their own API to see live data. No mocking required.

## Architecture

- **Builder**: Vite (fast, compatible with tsup/ESM setup)
- **Stories**: `components/ApiDashboard.stories.tsx` and `components/ApiDashboardV3.stories.tsx`
- **Story shape**: Each file exports a `Default` story with `apiUrl` and `timeWindow` as args
- **Deploy**: GitHub Actions builds Storybook on push to `main`, publishes to `gh-pages` branch
- **README**: Add Storybook badge linking to the deployed site

## Implementation Steps

1. Run `npx storybook@latest init` with Vite builder
2. Write stories for `ApiDashboard` and `ApiDashboardV3`
3. Add `.github/workflows/storybook.yml` for GitHub Pages deploy
4. Enable GitHub Pages on the repo (source: `gh-pages` branch)
5. Update README with Storybook badge
6. Commit and push
