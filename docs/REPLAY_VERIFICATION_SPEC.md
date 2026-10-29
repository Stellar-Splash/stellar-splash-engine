# Stellar Splash Engine - Replay Verification & Deterministic Physics Specification

## 1. Overview
The Stellar Splash Engine operates a headless, deterministic simulation kernel that validates match runs before committing tournament scores to the Soroban smart contract. This eliminates fraud, unauthorized speedhacks, collision cheats, and telemetry tampering.

## 2. Deterministic Physics Kernel

### 2.1 Fixed-Point Time Step
- Simulation runs at exactly 60 Hz ($\Delta t = 16.666\text{ ms}$).
- Position, velocity, and acceleration are updated using Euler integration with fixed decimal precision:
  $$x_{t+1} = x_t + v_t \cdot \Delta t$$
  $$v_{t+1} = v_t + a_t \cdot \Delta t$$

### 2.2 Seeded PRNG Execution
- All randomized elements (wave frequency, bubble velocity, obstacle spawning) are seeded using the match seed derived from the player's transaction ledger sequence and server entropy.
- Given identical inputs and seed, the simulation output is bit-for-bit identical across all Node.js and browser environments.

## 3. Fraud Detection & Heuristic Gates

### 3.1 Velocity & Acceleration Caps
- Maximum linear player speed: $450\text{ px/s}$.
- Maximum angular turn rate: $6.28\text{ rad/s}$.
- If any input frame indicates movement exceeding the physical envelope ($v > v_{\max}$), the replay is rejected immediately with code `ERR_VELOCITY_OVERFLOW`.

### 3.2 Shannon Movement Entropy
- Valid human control demonstrates organic entropy ($H \ge 2.1$).
- Perfectly quantized, straight-line inputs or synthetic macro patterns trigger `ERR_ENTROPY_TOO_LOW`.

### 3.3 Collision Invariant Proof
- Obstacle hitboxes are verified at every tick.
- If a replay claims a survival state when collision coordinates intersect obstacle geometry, the run is flagged as `ERR_GHOST_COLLISION`.
