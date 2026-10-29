#!/usr/bin/env node
const http = require('http');

const PORT = process.env.PORT || 3000;
console.log(`Inspecting channel accounts at http://localhost:${PORT}/api/channels/status...`);

http.get(`http://localhost:${PORT}/api/channels/status`, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    try {
      console.log('Channel Accounts Status:', JSON.parse(data));
    } catch {
      console.log(data);
    }
  });
}).on('error', (err) => {
  console.log(`Engine offline or unreachable: ${err.message}`);
});

