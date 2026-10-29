#!/usr/bin/env node
const http = require('http');

const PORT = process.env.PORT || 3000;
const url = `http://localhost:${PORT}/api/events/contracts/stream`;

console.log(`Streaming live Soroban events from ${url}... (Press Ctrl+C to stop)`);

http.get(url, (res) => {
  res.on('data', (chunk) => {
    process.stdout.write(chunk.toString());
  });
}).on('error', (err) => {
  console.error(`Connection error: ${err.message}`);
});

