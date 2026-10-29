/**
 * Generates Postman v2.1 Collection for Stellar Splash Engine API.
 */
const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: "Stellar Splash Engine API",
    description: "Automated test suite and endpoint collection for the Stellar Splash deterministic game engine and settlement daemon.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Health & System",
      item: [
        {
          name: "Health Check",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/health",
              host: ["{{base_url}}"],
              path: ["health"]
            }
          }
        },
        {
          name: "Prometheus Metrics",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/metrics",
              host: ["{{base_url}}"],
              path: ["metrics"]
            }
          }
        }
      ]
    },
    {
      name: "Tournaments & Verification",
      item: [
        {
          name: "List Tournaments",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/tournaments",
              host: ["{{base_url}}"],
              path: ["tournaments"]
            }
          }
        },
        {
          name: "Submit Match Replay",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                tournamentId: 101,
                player: "GCQ3OLBMJUGWN3PHYE3SDIKKIPVLJSFFWG4Q4CEABGHWGBEBPBKMY6OW",
                ticks: 3600,
                score: 4500,
                inputLog: []
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/replay/verify",
              host: ["{{base_url}}"],
              path: ["replay", "verify"]
            }
          }
        }
      ]
    },
    {
      name: "Live Events (SSE)",
      item: [
        {
          name: "Leaderboard Stream",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "text/event-stream" }],
            url: {
              raw: "{{base_url}}/events/leaderboard/101",
              host: ["{{base_url}}"],
              path: ["events", "leaderboard", "101"]
            }
          }
        }
      ]
    }
  ]
};

const outDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'StellarSplash_Engine.postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Generated Postman collection at: ' + outPath);
