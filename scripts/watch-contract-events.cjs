/**
 * Soroban Contract Event Filter & Watcher CLI.
 */

const WATCH_CONFIG = {
  contractId: "CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ",
  topics: ["tournament_created", "player_entered", "tournament_settled"],
  rpcUrl: "https://soroban-testnet.stellar.org"
};

function filterContractEvents(events = []) {
  return events.filter(e => {
    return WATCH_CONFIG.topics.includes(e.topic);
  });
}

function runEventWatcher() {
  console.log(`Watching contract events for: ${WATCH_CONFIG.contractId}`);
  console.log(`Subscribed topics: ${WATCH_CONFIG.topics.join(', ')}`);
}

if (require.main === module) {
  runEventWatcher();
}

module.exports = { WATCH_CONFIG, filterContractEvents, runEventWatcher };

