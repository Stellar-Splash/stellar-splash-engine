import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Postman Collection Verification', () => {
  const collectionPath = path.join(__dirname, '..', '..', 'docs', 'StellarSplash_Engine.postman_collection.json');

  it('exists and is valid JSON', () => {
    expect(fs.existsSync(collectionPath)).toBe(true);
    const content = fs.readFileSync(collectionPath, 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.info).toBeDefined();
    expect(parsed.info.name).toBe('Stellar Splash Engine API');
    expect(parsed.info.schema).toContain('schema.getpostman.com');
  });

  it('contains expected endpoint groups', () => {
    const parsed = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    const groupNames = parsed.item.map((i: { name: string }) => i.name);
    expect(groupNames).toContain('Health & System');
    expect(groupNames).toContain('Tournaments & Verification');
    expect(groupNames).toContain('Live Events (SSE)');
  });
});

