export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Game {
  id: string;
  gameName: string;
  playerCount: number;
  players: Player[];
  isPrivate: boolean;
  roomCode?: string;
  // Add other game properties as needed
}

export interface Player {
  userId: string;
  coins: number;
  influences: number;
  isActive: boolean;
}

export interface CreateGameRequest {
  gameName: string;
  playerCount: number;
  isPrivate: boolean;
  roomCode?: string;
}
