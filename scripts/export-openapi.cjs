#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { OpenApiSpecService } = require('../dist/services/openapi-spec.service');

console.log('Exporting OpenAPI 3.1 specification...');

try {
  const spec = OpenApiSpecService.generateSpec();
  const outPath = path.join(__dirname, '..', 'openapi.json');
  fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf8');
  console.log(`✅ OpenAPI spec exported to ${outPath}`);
} catch (err) {
  console.warn('Note: Run npm run build first before exporting openapi spec.');
}
