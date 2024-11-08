// Start of Selection
import ambassador from '../assets/images/cards/ambassador.png';
import assassin from '../assets/images/cards/assassin.png';
import captain from '../assets/images/cards/captain.png';
import contessa from '../assets/images/cards/contessa.png';
import duke from '../assets/images/cards/duke.png';
import backCardImage from '../assets/images/cards/back-card.png';

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
  actionInitiatorId?: string;
  actionsHistory: ActionLog[];
  pendingAction?: PendingAction;
}

export interface Player {
  userId: string;
  username: string;
  coins: number;
  influences: number;
  isActive: boolean;
  isConnected: boolean;
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
  actionType: 'income' | 'foreign_aid' | 'coup' | 'steal' | 'assassinate' | 'exchange' | 'tax' | 'ReturnCard' | 'block' | "blockAttempt" | "exchangeSelect";
  targetUserId?: string;
}

export type ActionResponse = 'pass' | 'block' | 'challenge';

export interface ActionParameters {
  targetUserId: string;
}

export interface CoupActionParameters extends ActionParameters { }

export interface StealActionParameters extends ActionParameters { }

export interface AssassinateActionParameters extends ActionParameters { }

export interface ExchangeActionParameters extends ActionParameters {
  drawnCards: string[];
}

export interface ForeignAidActionParameters extends ActionParameters { }

export interface TaxActionParameters extends ActionParameters { }

export interface BlockActionParameters extends ActionParameters {
  blockOption?: string;
}

export interface PendingAction {
  actionType: string;
  originalActionType: string;
  initiatorId: string;
  targetId?: string;
  parameters?: ActionParameters;
  isActionResolved: boolean;
  timestamp: Date;
  responses: { [userId: string]: string };
  response?: string;
  gameId: string;
}

// Action types
export interface GameAction {
  actionType: string;
  initiatorId: string;
  targetId?: string;
  parameters?: ActionParameters;
}

export interface CardImages {
  ambassador: string;
  assassin: string;
  captain: string;
  contessa: string;
  duke: string;
}

export const cardImages: CardImages = {
  ambassador,
  assassin,
  captain,
  contessa,
  duke,
};

export const backCard = backCardImage;

export interface RespondToPendingActionPayload {
  gameId: string;
  actionType: string;
  initiatorId: string;
  responderId: string;
  response: 'block' | 'challenge' | 'pass';
  targetId?: string;
}

