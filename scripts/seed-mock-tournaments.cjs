#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('Seeding mock tournament dataset for local development...');

const mockTournaments = [
  { id: 101, title: 'Aqua Dash Invitational #1', gameId: 'aqua-dash', prizeXlm: 100, entryFeeXlm: 5, status: 'OPEN' },
  { id: 102, title: 'Bubble Blaster Clash', gameId: 'bubble-blaster', prizeXlm: 250, entryFeeXlm: 10, status: 'ACTIVE' },
  { id: 103, title: 'Tide Runner Championship', gameId: 'tide-runner', prizeXlm: 500, entryFeeXlm: 25, status: 'SETTLED' },
];

const outDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'mock-tournaments.json');
fs.writeFileSync(outFile, JSON.stringify(mockTournaments, null, 2), 'utf8');

console.log(`✅ Seeded ${mockTournaments.length} mock tournaments to ${outFile}`);

