# Contributing to Stellar Splash Engine

Thank you for contributing to **Stellar Splash Engine**! The engine provides backend orchestration, high-frequency deterministic game replay verification, Horizon blockchain indexing, and real-time SSE broadcasting for Stellar Splash.

---

## Code of Conduct

All contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all members of the community with dignity and respect.

---

## Development Setup

### Prerequisites
- **Node.js**: `>= 18.x`
- **npm**: `>= 9.x`

### Getting Started
1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/Stellar-Splash/stellar-splash-engine.git
   cd stellar-splash-engine
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Automated Tests**:
   ```bash
   npm test
   ```
4. **Build and Run**:
   ```bash
   npm run build
   npm start
   ```

---

## Architecture Principles

- **Determinism**: Replay score calculations must always produce identical integer outputs given the same event logs. Floating point arithmetic is prohibited in score and basis-point calculations.
- **Verification Authority**: Do not trust client-submitted scores. Always calculate and compare against independently replayed results before signing attestations.
- **Horizon Idempotency**: Blockchain deposit indexers must handle duplicate polling runs idempotently without double-crediting prize vaults.

---

## Pull Request Guidelines

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/indexer-improvement
   ```
2. **Commit Style**:
   - Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
3. **Submit PR**:
   - Provide unit or integration tests for new endpoints, indexer routines, or verifier edge cases.
