# SmartFlash

> Web application for fast, AI-powered creation and management of flashcards using spaced repetition.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
5. [Project Status](#project-status)
6. [License](#license)

---

## Tech Stack

- **Frontend**
  - Astro 5
  - React 19
  - TypeScript 5
  - Tailwind 4
  - Shadcn/ui
- **Backend / BaaS**
  - Supabase (PostgreSQL, Auth, SDK)
- **AI Integration**
  - Openrouter.ai (multi-model gateway, cost limits)
- **CI/CD & Hosting**
  - GitHub Actions
  - DigitalOcean (Docker deployment)

---

## Getting Started

### Prerequisites

- **Node.js** v22.14.0 (use [nvm](https://github.com/nvm-sh/nvm))
- A Supabase project and credentials
- An Openrouter.ai API key

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Setup & Run

```bash
# Use Node version
nvm use 22.14.0

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Available Scripts

All commands assume you’re in the project root:

```bash
npm run dev       # Start Astro dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run astro     # Run Astro CLI
npm run lint      # Run ESLint
npm run lint:fix  # Run ESLint with auto-fix
npm run format    # Format code with Prettier
```

---

## Project Scope

### In-Scope Features

- AI-powered flashcard candidate generation (1000–10000 chars, <30s)
- Candidate review: accept, edit, or reject before saving
- Manual flashcard CRUD (front ≤200 chars, back ≤500 chars)
- Flashcard listing with search & pagination (20 items/page)
- User account management (register, email verify, login, password reset, delete)
- Row-level security: users only access their own flashcards
- Spaced repetition session view using external algorithm
- Event logging & metrics (generation count, acceptance rate)

### Out-of-Scope (MVP)

- No custom spaced-repetition engine (uses external)
- No importing from PDF, DOCX, etc.
- No sharing of flashcard sets between users
- No integration with other educational platforms
- No mobile application
- Initial MVP does not include CI/CD pipelines

---

## Project Status

**Status**: MVP / Active Development  
The core flashcard generation and management flows are under active development, with continuous improvements planned for user experience and scaling.

---

## License

> **TBD** – license to be defined.  
> Please add a `LICENSE` file or update the `license` field in `package.json`.
