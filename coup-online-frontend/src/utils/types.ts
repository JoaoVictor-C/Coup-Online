export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface ActionLog {
  timestamp: Date;
  playerId: string;
  action: string;
  targetId?: string;
}

export interface Game {
  id: string;
  gameName: string;
  playerCount: number;
  createdBy: string;
  isPrivate: boolean;
  roomCode: string;
  createdAt: Date;
  players: Player[];
  spectators: Spectator[];
  centralDeck: Card[];
  currentTurnUserId: string;
  isGameOver: boolean;
  winnerId?: string;
  isStarted: boolean;
  leaderId: string;
  pendingAction?: string;
  actionInitiatorId?: string;
  actionsHistory: ActionLog[];
}

export interface Player {
  userId: string;
  username: string;
  coins: number;
  influences: number;
  isActive: boolean;
  hand: Card[];
}

export interface Spectator {
  userId: string;
  username: string;
}

export interface Card {
  name: string;
  role: string;
  isRevealed: boolean;
}

export interface CreateGameRequest {
  gameName: string;
  playerCount: number;
  isPrivate: boolean;
}

export type GameState = 'LOBBY' | 'WAITING_FOR_PLAYERS' | 'ACTIVE' | 'WAITING_FOR_ACTION' | 'WAITING_FOR_CHALLENGE' | 'GAME_OVER' | 'WAITING_FOR_TURN';

export interface Action {
  type: 'income' | 'foreign_aid' | 'coup' | 'steal' | 'assassinate' | 'exchange' | 'tax';
  targetUserId?: string;
}

export interface PendingAction {
  type: Action['type'];
  initiatorId: string;
  targetUserId?: string;
  isResolved: boolean;
}

// Action types
export interface GameAction {
  actionType: string;
  initiatorId: string;
  targetId?: string;
  parameters?: ActionParameters;
}

export interface ActionParameters {
  targetUserId: string;
}

export interface CoupActionParameters extends ActionParameters {}

export interface StealActionParameters extends ActionParameters {}

export interface AssassinateActionParameters extends ActionParameters {}

export interface CardImages {
  ambassador: string;
  assassin: string;
  captain: string;
  contessa: string;
  duke: string;
}

export const cardImages: CardImages = {
  ambassador: require('../assets/images/cards/ambassador.png'),
  assassin: require('../assets/images/cards/assassin.png'),
  captain: require('../assets/images/cards/captain.png'),
  contessa: require('../assets/images/cards/contessa.png'),
  duke: require('../assets/images/cards/duke.png'),
};

export const backCard = require('../assets/images/cards/back-card.png');
