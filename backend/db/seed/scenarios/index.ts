/**
 * Scenario Registry
 * Central registry of all available seed scenarios
 */

import type { SeedScenario, SeedScenarioConfig, SeedResult } from '@shared/types/dev-mode';
import { emptyScenario } from './empty';
import { busyDayScenario } from './busy-day';
import { edgeCasesScenario } from './edge-cases';

/**
 * All available seed scenarios
 */
export const scenarios: SeedScenarioConfig[] = [
  emptyScenario,
  busyDayScenario,
  edgeCasesScenario,
];

/**
 * Scenario metadata for API responses (without the seed function)
 */
export interface ScenarioMetadata {
  id: SeedScenario;
  name: string;
  description: string;
}

/**
 * Get metadata for all scenarios (safe to send to client)
 */
export function getScenarioMetadata(): ScenarioMetadata[] {
  return scenarios.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

/**
 * Run a scenario by its ID
 */
export async function runScenario(scenarioId: SeedScenario): Promise<SeedResult> {
  const scenario = scenarios.find((s) => s.id === scenarioId);

  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  return scenario.seed();
}
