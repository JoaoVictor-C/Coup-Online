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
  ACTION_EXECUTED_FAILURE
} from './actionTypes';
import socketService from '../../services/socket';
import api from '../../services/api'; // Ensure this is correctly set up

// Fetch Game State
export const fetchGame = (gameId) => async (dispatch, getState) => {
  dispatch({ type: FETCH_GAME_START });
  try {
    const res = await api.get(`/game/${gameId}`);
    const gameData = res.data;

    const { userId } = getState().auth;

    gameData.players = gameData.players.map(player => ({
      ...player,
      user: player.playerProfile.user || {},
      username: player.playerProfile.user?.username || 'Unknown',
      characters: player.characters,
      coins: player.coins,
    }));

    gameData.currentUserId = userId;

    dispatch({ type: FETCH_GAME_SUCCESS, payload: gameData });
    return gameData;
  } catch (error) {
    dispatch({ type: FETCH_GAME_ERROR, payload: error.response?.data?.message || 'Error fetching game' });
    return { error: error.response?.data?.message || 'Error fetching game' };
  }
};

// Join Game
export const joinGame = (gameId) => async (dispatch, getState) => {
  try {
    console.log('Joining game with ID:', gameId);
    const socket = socketService.getSocket();
    const { userId } = getState().auth;

    return new Promise((resolve, reject) => {
      console.log('Joining game with ID:', gameId);
      console.log('User ID:', userId);
      socket.emit('joinGame', { gameId, userId }, (response) => {
        if (response.success) {
          dispatch({ type: JOIN_GAME_SUCCESS, payload: response.game });
          if (response.game.status === 'in_progress') {
            // If the game has started, fetch the initial game state
            dispatch(fetchGame(gameId));
          }
          resolve({ gameId: response.game._id, status: response.game.status });
        } else {
          dispatch({ type: JOIN_GAME_ERROR, payload: response.message || 'Error joining game' });
          reject({ gameId: null, error: response.message || 'Error joining game' });
        }
      });
    });
  } catch (error) {
    dispatch({ type: JOIN_GAME_ERROR, payload: error.message || 'Error joining game' });
    return { gameId: null, error: error.message || 'Error joining game' };
  }
};

// Perform Action
export const performAction = (gameId, actionType, targetUserId, userId) => async (dispatch) => {
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

// Create Game
export const createGame = (playerCount) => async (dispatch) => {
  try {
    const res = await api.post('/game/create', { playerCount });
    dispatch({ type: CREATE_GAME_SUCCESS, payload: res.data });
    console.log(res.data)
    return res.data;
  } catch (error) {
    dispatch({ type: CREATE_GAME_ERROR, payload: error.response?.data?.message || 'Failed to create game' });
    throw error;
  }
};

// Start Game
export const startGame = (gameId) => async (dispatch) => {
  try {
    const res = await api.post(`/game/${gameId}/start`);
    if (res.data.game) {
      dispatch({ type: START_GAME_SUCCESS, payload: res.data.game });
      // Optionally navigate to the game page
      // e.g., history.push(`/game/${gameId}`);
      return res.data.game;
    } else {
      throw new Error('Failed to start game');
    }
  } catch (error) {
    console.error('Start Game Error:', error);
    dispatch({ type: START_GAME_ERROR, payload: error.response?.data?.message || 'Error starting game' });
    return { error: error.response?.data?.message || 'Error starting game' };
  }
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
export const performChallenge = (gameId, challengerId) => async (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('challenge', { gameId, challengerId }, (response) => {
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
export const performBlock = (gameId, blockerId, actionType) => async (dispatch) => {
  const socket = socketService.getSocket();
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

// Respond to Block
export const respondToBlock = (gameId, response, userId) => async (dispatch) => {
  const socket = socketService.getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('respondToBlock', { gameId, response, userId }, (response) => {
      if (response.success) {
        dispatch({ type: 'RESPOND_TO_BLOCK_SUCCESS', payload: response.message });
        resolve(response.message);
      } else {
        dispatch({ type: 'RESPOND_TO_BLOCK_FAILURE', payload: response.message });
        reject(response.message);
      }
    });
  });
};

