# 🧱 Brick CLI

A **framework-agnostic** CLI tool for managing reusable code templates. Stop copy-pasting code between projects — save it once, use it everywhere.

## The Problem

Every developer has faced this workflow:

1. Create a new project (`nest new my-app`)
2. Open an existing project with code you want to reuse
3. Manually copy-paste files (auth module, pagination utils, config files)
4. Adjust imports, fix paths, install missing dependencies
5. **Repeat for every new project**

**Brick eliminates steps 2-4 entirely.**

## Installation

```bash
# Install globally via npm
npm install -g brick-cli

# Or with yarn
yarn global add brick-cli

# Or with pnpm
pnpm add -g brick-cli

# Or with bun
bun add -g brick-cli
```

After installation, the `brick` command will be available globally:

```bash
brick --version
```

## Quick Start

```bash
# 1. Initialize brick (one-time setup)
brick init

# 2. Save a folder as a reusable template
brick save my-auth ./src/auth --description "JWT authentication module"

# 3. View your saved templates
brick list

# 4. Apply a template to a new project
cd ~/new-project
brick apply my-auth ./src/auth
```

## Commands

### `brick init`

Initialize Brick on your system. Creates the storage directory at `~/.codebrick/`.

```bash
brick init
```

### `brick save <name> [path]`

Save a folder as a reusable template.

```bash
# Save current directory
brick save my-template

# Save a specific path
brick save nestjs-auth ./src/auth

# With options
brick save nestjs-auth ./src/auth \
  --description "JWT authentication for NestJS" \
  --tags auth,jwt,nestjs \
  --detect-deps
```

**Options:**

- `-d, --description <desc>` — Template description
- `-t, --tags <tags>` — Comma-separated tags
- `--include <patterns>` — Glob patterns to include
- `--exclude <patterns>` — Glob patterns to exclude
- `--detect-deps` — Auto-detect dependencies from imports

### `brick list`

List all saved templates.

```bash
brick list

# Filter by type
brick list --local
brick list --remote

# Filter by tag
brick list --tag auth

# Detailed view
brick list --detailed
```

**Output:**

```
  #   Name                Type    Files  Description
  ─────────────────────────────────────────────────────────────────────
  0   nestjs-auth         local   5      JWT authentication module
  1   react-modal         local   3      Animated modal with backdrop
  2   docker-dev          local   4      Docker Compose dev setup

  3 templates (3 local, 0 remote)
```

> 💡 **Tip:** Use the index number (`0`, `1`, `2`) instead of the full name in any command!

### `brick tree <name|index>`

Display the file structure of a template.

```bash
# By name
brick tree nestjs-auth

# By index
brick tree 0

# With file sizes
brick tree 0 --size
```

**Output:**

```
nestjs-auth
├── guards/
│   └── jwt.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── auth.controller.ts
├── auth.module.ts
└── auth.service.ts

5 files, 2 directories
```

### `brick apply <name|index> [destination]`

Apply a template to your project.

```bash
# Apply to current directory
brick apply nestjs-auth

# Apply by index
brick apply 0 ./src/auth

# With options
brick apply 0 --force --latest
```

**Options:**

- `-f, --force` — Overwrite existing files without prompting
- `--skip-existing` — Skip files that already exist
- `--dry-run` — Preview changes without writing files
- `--latest` — Use @latest for all dependency versions
- `--no-deps` — Skip dependency installation prompts

### `brick info <name|index>`

Show detailed information about a template.

```bash
brick info nestjs-auth
brick info 0
```

### `brick size [name|index]`

Show the size of templates.

```bash
# Show all template sizes
brick size

# Show specific template size
brick size nestjs-auth
brick size 0
```

**Output (all templates):**

```
  #   Name                Type    Files      Size
  ─────────────────────────────────────────────────────────────────────
  0   nestjs-auth         local   5          12.4 KB
  1   react-modal         local   3          8.2 KB
  2   docker-dev          local   4          3.1 KB

Total: 12 files, 23.7 KB
```

**Output (single template):**

```
nestjs-auth

  Files:       5
  Directories: 2
  Total Size:  12.4 KB
```

### `brick add <name|index> <files...>`

Add files to an existing template.

```bash
# Add a single file
brick add nestjs-auth ./src/auth/dto/login.dto.ts

# Add by index
brick add 0 ./src/auth/dto/*.ts

# Add a directory
brick add 0 ./src/auth/decorators/
```

### `brick remove-file <name|index> <files...>`

Remove files from a template.

```bash
brick remove-file nestjs-auth auth.controller.ts
brick remove-file 0 dto/
```

### `brick delete <name|index>`

Delete a template entirely.

```bash
brick delete nestjs-auth

# By index
brick delete 0

# Skip confirmation
brick delete 0 --force
```

## Smart Ignore System

Brick **automatically ignores** common dependency directories, build outputs, and generated files across all frameworks. This keeps your templates clean and portable.

### Ignored Directories

| Framework     | Automatically Ignored                                           |
| ------------- | --------------------------------------------------------------- |
| **Node.js**   | `node_modules/`, `.npm/`, `.yarn/`, `.pnpm-store/`              |
| **Python**    | `__pycache__/`, `.venv/`, `venv/`, `.pytest_cache/`, `.mypy_cache/` |
| **Flutter**   | `.dart_tool/`, `.pub-cache/`, `build/`, `.flutter-plugins*`     |
| **Rust**      | `target/`                                                       |
| **Go**        | `vendor/`                                                       |
| **Java**      | `.gradle/`, `.idea/`, `out/`, `build/`                          |
| **iOS**       | `Pods/`, `.symlinks/`, `DerivedData/`                           |
| **.NET**      | `bin/`, `obj/`, `packages/`                                     |
| **Build**     | `dist/`, `build/`, `.next/`, `.nuxt/`, `.output/`, `.vercel/`   |
| **Cache**     | `.cache/`, `.temp/`, `.turbo/`, `coverage/`                     |
| **VCS**       | `.git/`, `.svn/`, `.hg/`                                        |
| **IDE**       | `.idea/`, `.vscode/` (settings, not launch configs)             |

### Ignored Files

| Category     | Files                                                              |
| ------------ | ------------------------------------------------------------------ |
| **Locks**    | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Podfile.lock` |
| **Env**      | `.env`, `.env.local`, `.env.production`, `.env.*`                  |
| **OS**       | `.DS_Store`, `Thumbs.db`, `desktop.ini`                            |
| **Logs**     | `*.log`, `npm-debug.log*`, `yarn-debug.log*`                       |
| **Metadata** | `brick.json` (template metadata)                                   |

This means when you save a template, you get **only the source code** — no bloat:

```bash
# Before smart ignore (hypothetical)
flutter-app: 1,247 files, 89.2 MB  ❌

# With smart ignore (actual)
flutter-app: 42 files, 156 KB      ✅
```

## Framework Agnostic

Brick works with **any language or framework** since it operates at the file level:

| Category       | Examples                                             |
| -------------- | ---------------------------------------------------- |
| Frontend       | React, Vue, Angular, Svelte, Solid, Astro            |
| Backend        | NestJS, Express, FastAPI, Django, Rails, Spring Boot |
| Mobile         | React Native, Flutter, Swift, Kotlin                 |
| Languages      | TypeScript, JavaScript, Python, Go, Rust, Java, C#   |
| Infrastructure | Terraform, Pulumi, Docker, Kubernetes configs        |
| Other          | Markdown docs, config files, shell scripts           |

## Storage Location

Templates are stored locally at:

```
~/.codebrick/
├── config.json      # Configuration
├── store.json       # Template registry
└── templates/       # Actual template files
    ├── nestjs-auth/
    ├── react-modal/
    └── ...
```

## Examples

### Save a NestJS Auth Module

```bash
# From your existing project with a working auth implementation
cd ~/projects/my-backend
brick save nestjs-auth ./src/auth \
  --description "JWT authentication with Passport" \
  --tags nestjs,auth,jwt,passport \
  --detect-deps
```

### Apply to a New Project

```bash
# Create new project
nest new my-new-api
cd my-new-api

# Apply the auth template (by index or name)
brick apply 0 ./src/auth

# Install dependencies (brick will show you the command)
npm install @nestjs/jwt @nestjs/passport passport-jwt bcrypt
```

### Save React Components

```bash
brick save react-modal ./src/components/Modal \
  --description "Animated modal with backdrop" \
  --tags react,modal,ui,animation
```

### Save Flutter Clean Architecture

```bash
brick save flutter-clean ./lib \
  --description "Clean architecture with BLoC" \
  --tags flutter,bloc,clean-architecture
```

### Save Docker Configs

```bash
brick save docker-dev ./docker \
  --description "Docker Compose development setup" \
  --tags docker,devops
```

### Quick Operations with Index

```bash
# List templates
brick list
#   0   nestjs-auth
#   1   react-modal
#   2   flutter-clean

# Use index for faster operations
brick tree 0
brick info 1
brick apply 2 ./lib
brick size 0
brick delete 1 --force
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
