/**
 * Hard counters: one hero who, by a specific mechanic, makes another much worse. Reviewed by hand and
 * checked against 177k public matches (Oct 2026). `gap` is how many win-rate points worse the hero does.
 */
export const HARD_COUNTERS: { hero: string; counter: string; gap: number }[] = [
  { hero: "Medusa", counter: "Anti-Mage", gap: 11.8 },
  { hero: "Broodmother", counter: "Earthshaker", gap: 9.8 },
  { hero: "Huskar", counter: "Viper", gap: 9.1 },
  { hero: "Abaddon", counter: "Ancient Apparition", gap: 8.2 },
  { hero: "Meepo", counter: "Earthshaker", gap: 7.6 },
  { hero: "Necrophos", counter: "Ancient Apparition", gap: 7.3 },
  { hero: "Phantom Lancer", counter: "Tidehunter", gap: 7.2 },
  { hero: "Anti-Mage", counter: "Axe", gap: 6.5 },
  { hero: "Tinker", counter: "Anti-Mage", gap: 5.6 },
  { hero: "Slark", counter: "Disruptor", gap: 5.6 },
  { hero: "Bristleback", counter: "Viper", gap: 5.5 },
  { hero: "Bristleback", counter: "Ancient Apparition", gap: 5.2 },
  { hero: "Phantom Lancer", counter: "Earthshaker", gap: 5.1 },
  { hero: "Outworld Devourer", counter: "Nyx Assassin", gap: 4.8 },
  { hero: "Huskar", counter: "Necrophos", gap: 4.3 },
  { hero: "Phantom Lancer", counter: "Ember Spirit", gap: 3.9 },
  { hero: "Phantom Assassin", counter: "Axe", gap: 3.5 },
];
