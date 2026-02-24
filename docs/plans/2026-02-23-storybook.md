# Storybook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Storybook with Vite builder, stories for both components, and auto-deploy to GitHub Pages on push to main.

**Architecture:** Storybook 8 with Vite builder sits alongside the existing tsup build. Stories use `apiUrl` as a configurable arg so developers can point components at their own API. A GitHub Actions workflow builds and deploys the static Storybook site to the `gh-pages` branch.

**Tech Stack:** Storybook 8, Vite, React, TypeScript, GitHub Actions, GitHub Pages

---

### Task 1: Install Storybook

**Files:**
- Modify: `package.json` (storybook adds scripts + devDependencies)
- Create: `.storybook/main.ts`, `.storybook/preview.ts`

**Step 1: Run the Storybook initializer**

```bash
cd /Users/taylorstephens/Dev/api-dashboard
npx storybook@latest init --builder vite --yes 2>&1
```

Expected: installs packages, creates `.storybook/` config, adds `storybook` and `build-storybook` scripts to `package.json`. May create a `src/stories/` folder with example stories — delete it.

**Step 2: Delete generated example stories**

```bash
rm -rf src/stories stories
```

(Only delete if they exist — storybook init sometimes creates them.)

**Step 3: Verify Storybook starts**

```bash
npm run storybook -- --ci 2>&1 | head -20
```

Expected: server starts on port 6006. Ctrl+C to stop.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: install Storybook with Vite builder"
```

---

### Task 2: Write story for ApiDashboard

**Files:**
- Create: `components/ApiDashboard.stories.tsx`

**Step 1: Create the story file**

```tsx
// components/ApiDashboard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ApiDashboard } from "./ApiDashboard";

const meta: Meta<typeof ApiDashboard> = {
  title: "Components/ApiDashboard",
  component: ApiDashboard,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    apiUrl: {
      control: "text",
      description: "URL of your API dashboard endpoint",
    },
    title: {
      control: "text",
      description: "Dashboard heading",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ApiDashboard>;

export const Default: Story = {
  args: {
    apiUrl: "https://your-api.example.com/dashboard",
    title: "API Overview",
  },
};
```

**Step 2: Verify story appears in Storybook**

```bash
npm run storybook -- --ci 2>&1 | grep -i "storybook"
```

Open browser to http://localhost:6006 — confirm "ApiDashboard" appears in sidebar under "Components".

**Step 3: Commit**

```bash
git add components/ApiDashboard.stories.tsx
git commit -m "feat: add ApiDashboard story"
```

---

### Task 3: Write story for ApiDashboardV3

**Files:**
- Create: `components/ApiDashboardV3.stories.tsx`

**Step 1: Create the story file**

```tsx
// components/ApiDashboardV3.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ApiDashboardV3 } from "./ApiDashboardV3";

const meta: Meta<typeof ApiDashboardV3> = {
  title: "Components/ApiDashboardV3",
  component: ApiDashboardV3,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    apiUrl: {
      control: "text",
      description: "URL of your API dashboard endpoint",
    },
    title: {
      control: "text",
      description: "Dashboard heading",
    },
    pageSize: {
      control: { type: "number", min: 1, max: 20 },
      description: "Number of endpoints per page",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ApiDashboardV3>;

export const Default: Story = {
  args: {
    apiUrl: "https://your-api.example.com/dashboard",
    title: "API Overview",
    pageSize: 7,
  },
};
```

**Step 2: Commit**

```bash
git add components/ApiDashboardV3.stories.tsx
git commit -m "feat: add ApiDashboardV3 story"
```

---

### Task 4: Add GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/storybook.yml`

**Step 1: Create the workflow**

```yaml
# .github/workflows/storybook.yml
name: Deploy Storybook

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - run: npm run build-storybook -- --output-dir storybook-static

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

**Step 2: Commit and push**

```bash
git add .github/workflows/storybook.yml
git commit -m "feat: deploy Storybook to GitHub Pages on push to main"
git push
```

**Step 3: Enable GitHub Pages**

Go to github.com/tstephx/api-dashboard → **Settings → Pages → Source** → set to **Deploy from a branch** → branch: `gh-pages`, folder: `/ (root)` → Save.

Wait ~2 minutes for the Actions workflow to run, then visit:
`https://tstephx.github.io/api-dashboard/`

---

### Task 5: Update README with Storybook badge

**Files:**
- Modify: `README.md`

**Step 1: Add badge below the first heading**

Add this line directly after the `# @tstephx/api-dashboard` heading in README.md:

```markdown
[![Storybook](https://img.shields.io/badge/Storybook-docs-FF4785?logo=storybook&logoColor=white)](https://tstephx.github.io/api-dashboard/)
```

**Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add Storybook badge to README"
git push
```

---

### Done

Storybook is live at `https://tstephx.github.io/api-dashboard/`. Every push to `main` rebuilds and redeploys it automatically.
