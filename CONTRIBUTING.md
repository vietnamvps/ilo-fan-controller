# Contributing to ilo-fan-controller

Thank you for your interest in contributing to this project!

## How to Contribute

1. **Fork the Repository:** Create your own branch from `main`.
2. **Setup Development Environment:**
   ```bash
   pnpm install
   pnpm dev
   ```
3. **Coding Standards:**
   - Write clean, maintainable TypeScript.
   - Run type checking: `npx tsc --noEmit`
   - Run linter: `pnpm lint`
   - Verify internationalization strings: `node scripts/check-i18n.js`
4. **Pull Requests:**
   - Keep pull requests focused on a single feature or bug fix.
   - Do not commit local database files (`data/app.db`) or environment files (`.env`).
   - Describe changes and testing evidence clearly in your PR description.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
