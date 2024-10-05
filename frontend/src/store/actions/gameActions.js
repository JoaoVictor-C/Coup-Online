import {
  FETCH_GAME_SUCCESS,
  FETCH_GAME_ERROR,
  JOIN_GAME_SUCCESS,
  JOIN_GAME_ERROR,
  CREATE_GAME_SUCCESS,
  CREATE_GAME_ERROR,
  FETCH_GAME_START,
  START_GAME_SUCCESS,
  START_GAME_ERROR,
  CHALLENGE_SUCCESS,
  CHALLENGE_FAILURE,
  BLOCK_SUCCESS,
  BLOCK_FAILURE,
  GAME_STARTED,
  GAME_UPDATE,
  GAME_OVER,
  PLAYER_DISCONNECTED,
  ACCEPT_ACTION_SUCCESS,
  ACCEPT_ACTION_FAILURE,
  PENDING_ACTION,
  ACTION_EXECUTED_SUCCESS,
  ACTION_EXECUTED_FAILURE,
  RESPOND_TO_BLOCK_SUCCESS,
  RESPOND_TO_BLOCK_FAILURE
} from './actionTypes';
import socketService from '../../services/socket';
import api from '../../services/api'; // Ensure this is correctly set up

// Fetch Game State using Socket.IO
export const fetchGame = (gameId) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    dispatch({ type: FETCH_GAME_START });
    const { userId } = getState().auth;
    const socket = socketService.getSocket();

    socket.emit('getGame', { gameId, userId }, (response) => {
      if (response.success) {
        dispatch({ type: FETCH_GAME_SUCCESS, payload: response.game });
        resolve(response.game);
      } else {
        dispatch({ type: FETCH_GAME_ERROR, payload: response.message || 'Error fetching game' });
        reject(new Error(response.message || 'Error fetching game'));
      }
    });
  });
};

// Join Game using Socket.IO
export const joinGame = (gameId) => (dispatch, getState) => {
  const socket = socketService.getSocket();
  const { userId } = getState().auth;

  return new Promise((resolve, reject) => {
    socket.emit('joinGame', { gameId, userId }, (response) => {
      if (response.success) {
        dispatch({ type: JOIN_GAME_SUCCESS, payload: response.game });
        if (response.game.status === 'in_progress') {
          dispatch(fetchGame(gameId));
        }
        resolve({ gameId: response.game._id, status: response.game.status });
      } else {
        dispatch({ type: JOIN_GAME_ERROR, payload: response.message || 'Error joining game' });
        reject({ gameId: null, error: response.message || 'Error joining game' });
      }
    });
  });
};

// Perform Action using Socket.IO
export const performAction = (gameId, actionType, targetUserId, userId) => (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('action', { gameId, actionType, targetUserId, userId }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Create Game using Socket.IO
export const createGame = (playerCount) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('createGame', { playerCount }, (response) => {
      if (response.success) {
        dispatch({ type: CREATE_GAME_SUCCESS, payload: response.game });
        resolve(response.game);
      } else {
        dispatch({ type: CREATE_GAME_ERROR, payload: response.message || 'Failed to create game' });
        reject(response.message || 'Failed to create game');
      }
    });
  });
};

// Start Game using Socket.IO
export const startGame = (gameId) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('startGame', { gameId }, (response) => {
      if (response.success) {
        dispatch({ type: START_GAME_SUCCESS, payload: response.game });
        resolve(response.game);
      } else {
        dispatch({ type: START_GAME_ERROR, payload: response.message || 'Failed to start game' });
        reject(response.message || 'Failed to start game');
      }
    });
  });
};

// Accept Action
export const acceptAction = (gameId) => async (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('acceptAction', { gameId }, (response) => {
      if (response.success) {
        dispatch({ type: ACCEPT_ACTION_SUCCESS, payload: response.message });
        resolve(response.message);
      } else {
        dispatch({ type: ACCEPT_ACTION_FAILURE, payload: response.message });
        reject(response.message);
      }
    });
  });
};

// Perform Challenge
export const performChallenge = (gameId, challengerId, targetType) => async (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('challenge', { gameId, challengerId, targetType }, (response) => {
      if (response.success) {
        dispatch({ type: CHALLENGE_SUCCESS, payload: response.message });
        resolve(response.message);
      } else {
        dispatch({ type: CHALLENGE_FAILURE, payload: response.message });
        reject(response.message);
      }
    });
  });
};

// Perform Block
export const performBlock = (gameId, blockerId, actionType) => async (dispatch, getState) => {
  const socket = socketService.getSocket();
  const { currentGame } = getState().game;
  
  // Verify if the action can be blocked
  if (!currentGame.pendingAction.canBeBlocked) {
    return Promise.reject('This action cannot be blocked.');
  }

  return new Promise((resolve, reject) => {
    socket.emit('block', { gameId, blockerId, actionType }, (response) => {
      if (response.success) {
        dispatch({ type: BLOCK_SUCCESS, payload: response.message });
        resolve(response.message);
      } else {
        dispatch({ type: BLOCK_FAILURE, payload: response.message });
        reject(response.message);
      }
    });
  });
};

// Pending Action
export const pendingAction = (game) => ({
  type: PENDING_ACTION,
  payload: game,
});

// Game Started
export const gameStarted = (gameId, currentPlayerIndex, players) => ({
  type: GAME_STARTED,
  payload: { gameId, currentPlayerIndex, players },
});

// Game Update
export const gameUpdate = (updatedGame) => ({
  type: GAME_UPDATE,
  payload: updatedGame,
});

// Game Over
export const gameOver = (gameId) => ({
  type: GAME_OVER,
  payload: gameId,
});

// Player Disconnected
export const playerDisconnected = (gameId, userId) => ({
  type: PLAYER_DISCONNECTED,
  payload: { gameId, userId },
});

// Join game error
export const joinGameError = (error) => ({
  type: JOIN_GAME_ERROR,
  payload: error,
});

// Join game success
export const joinGameSuccess = (game) => ({
  type: JOIN_GAME_SUCCESS,
  payload: game,
});

// Example: Respond to Block
export const respondToBlock = (gameId, response, userId) => (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('respondToBlock', { gameId, response, userId }, (responseData) => {
      if (responseData.success) {
        dispatch({ type: RESPOND_TO_BLOCK_SUCCESS, payload: responseData.message });
        resolve(responseData.message);
      } else {
        dispatch({ type: RESPOND_TO_BLOCK_FAILURE, payload: responseData.message });
        reject(responseData.message);
      }
    });
  });
};