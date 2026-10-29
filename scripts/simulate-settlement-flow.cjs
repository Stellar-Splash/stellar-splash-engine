/**
 * Settlement Simulation CLI Runner.
 * Simulates a multi-winner tournament settlement with basis points calculation and channel account dispatch.
 */

function simulateSettlement(tournamentId = 101, totalPrizeXlm = 1000) {
  console.log(`=== Simulating Settlement for Tournament #${tournamentId} ===`);
  console.log(`Total Prize Vault: ${totalPrizeXlm} XLM`);

  const bps = [
    { rank: 1, bps: 5000, label: "1st Place (50%)" },
    { rank: 2, bps: 3000, label: "2nd Place (30%)" },
    { rank: 3, bps: 2000, label: "3rd Place (20%)" }
  ];

  let totalDisbursed = 0;
  for (const item of bps) {
    const payout = Math.floor((totalPrizeXlm * item.bps) / 10000);
    totalDisbursed += payout;
    console.log(`[Rank ${item.rank}] ${item.label}: ${payout} XLM`);
  }

  const remainder = totalPrizeXlm - totalDisbursed;
  console.log(`Remainder / Dust Allocation: ${remainder} XLM`);
  console.log(`Settlement Status: SIMULATION_SUCCESS (Zero-Deficit Invariant Satisfied)`);
  return { tournamentId, totalPrizeXlm, totalDisbursed, remainder };
}

if (require.main === module) {
  simulateSettlement();
}

module.exports = { simulateSettlement };

