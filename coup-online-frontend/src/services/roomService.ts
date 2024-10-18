import api from '@services/api';
import { Game, CreateGameRequest, GameAction } from '@utils/types';

const getPublicRooms = async (): Promise<Game[]> => {
  const response = await api.get('/rooms/public');
  return response.data;
};

const searchRooms = async (searchTerm: string): Promise<Game[]> => {
  const response = await api.get('/rooms/search', {
    params: { query: searchTerm },
  });
  return response.data;
};

const createRoom = async (request: CreateGameRequest): Promise<Game> => {
  const response = await api.post('/game/create', request);
  return response.data;
};

const joinRoom = async (gameIdOrCode: string): Promise<Game> => {
  const response = await api.post('/game/join', { GameIdOrCode: gameIdOrCode });
  return response.data;
};

const startGame = async (gameIdOrCode: string): Promise<Game> => {
  const response = await api.post('/game/start', { GameIdOrCode: gameIdOrCode });
  return response.data;
};

const restartGame = async (gameIdOrCode: string): Promise<Game> => {
  const response = await api.post('/game/restart', { GameIdOrCode: gameIdOrCode });
  return response.data;
};

const disconnect = async (gameIdOrCode: string): Promise<void> => {
  await api.post('/game/disconnect', { GameIdOrCode: gameIdOrCode });
};

// Switch to Spectator
const switchToSpectator = async (gameIdOrCode: string): Promise<void> => {
  await api.post('/game/spectate', { GameIdOrCode: gameIdOrCode });
};

const roomService = {
  getPublicRooms,
  searchRooms,
  createRoom,
  joinRoom,
  startGame,
  restartGame,
  disconnect,
  switchToSpectator,
};

export default roomService;