/**
 * Engine SDK Types - Shared across backend daemon and client consumers.
 */

export interface EngineTournamentConfig {
  tournamentId: number;
  contractId: string;
  minEntropyThreshold: number;
  maxTicks: number;
  channelKey: string;
}

export interface EngineReplayPacket {
  tournamentId: number;
  player: string;
  ticks: number;
  score: number;
  seed: string;
  entropy: number;
}
