import api from '@services/api';
import { Game, CreateGameRequest } from '@utils/types';

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
  const response = await api.post('/rooms', request);
  return response.data;
};

const joinRoom = async (roomCode: string): Promise<Game> => {
  const response = await api.post('/game/join', { GameId: roomCode });
  return response.data;
};

const roomService = {
  getPublicRooms,
  searchRooms,
  createRoom,
  joinRoom,
};

export default roomService;
