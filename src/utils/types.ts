// Additions in types.ts

export interface Spectator {
  userId: string;
  username: string;
}

export interface Game {
  // ... existing properties
  spectators: Spectator[];
}
