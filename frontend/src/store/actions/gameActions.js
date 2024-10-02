import api from '../../services/api';
import { FETCH_GAME_SUCCESS, FETCH_GAME_ERROR, JOIN_GAME_SUCCESS, JOIN_GAME_ERROR, UPDATE_GAME } from './actionTypes';
import socket from '../../services/socket';

// Fetch Game State
export const fetchGame = (gameId) => async (dispatch) => {
  try {
    const res = await api.get(`/game/${gameId}`);
    dispatch({ type: FETCH_GAME_SUCCESS, payload: res.data.game });
  } catch (error) {
    dispatch({ type: FETCH_GAME_ERROR, payload: error.response.data.message });
  }
};

// Join Game
export const joinGame = (gameId) => async (dispatch) => {
  try {
    const res = await api.post('/game/join', { gameId });
    dispatch({ type: JOIN_GAME_SUCCESS, payload: res.data });
  } catch (error) {
    dispatch({ type: JOIN_GAME_ERROR, payload: error.response.data.message });
  }
};

// Make Player Action
export const makePlayerAction = (gameId, actionType, details) => (dispatch) => {
    socket.emit('playerAction', { gameId, action: actionType, details });
  };

// Update Game (from Socket)
export const updateGame = (updatedGame) => ({
  type: UPDATE_GAME,
  payload: updatedGame,
});