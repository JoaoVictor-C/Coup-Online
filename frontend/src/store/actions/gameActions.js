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
  GAME_OVER,
  PLAYER_DISCONNECTED,
  GAME_STARTED,
  GAME_UPDATE,
  ACCEPT_ACTION_SUCCESS,
  ACCEPT_ACTION_FAILURE,
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
        resolve({ gameId: response.game._id, status: response.game.status });
      } else {
        dispatch({ type: JOIN_GAME_ERROR, payload: response.message || 'Error joining game' });
        reject({ gameId: null, error: response.message || 'Error joining game' });
      }
    });
  });
};

// gameStarted
export const gameStarted = (game) => ({
  type: GAME_STARTED,
  payload: game,
});

// gameUpdate
export const gameUpdate = (game) => ({
  type: GAME_UPDATE,
  payload: game,
});

// gameOver
export const gameOver = (game) => ({
  type: GAME_OVER,
  payload: game,
});

// playerDisconnected
export const playerDisconnected = (game) => ({
  type: PLAYER_DISCONNECTED,
  payload: game,
});

// Perform Action using Socket.IO
export const performAction = (gameId, actionType, targetUserId = '') => (dispatch, getState) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('action', { gameId, actionType, targetUserId }, (response) => {
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

// Challenge Action
export const performChallenge = (gameId, challengerId) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('challenge', { gameId, challengerId }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Block Action
export const performBlock = (gameId, blockerId, actionType) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('block', { gameId, actionType, blockerId }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Perform Exchange
export const performExchange = (gameId) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('exchange', { gameId }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Select Exchange Cards
export const selectExchangeCards = (gameId, selectedCards) => (dispatch) => {
  const socket = socketService.getSocket();
  console.log(selectedCards);
  return new Promise((resolve, reject) => {
    socket.emit('selectExchangeCards', { gameId, selectedCards }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Respond to Block Action
export const respondToBlock = (gameId, response, userId) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('respondToBlock', { gameId, response }, (res) => {
      if (res.success) {
        resolve(res.message);
      } else {
        reject(res.message);
      }
    });
  });
};

// Accept Action
export const acceptAction = (gameId) => (dispatch) => {
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

// Perform Challenge Success
export const performChallengeSuccess = (gameId, cards) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('challengeSuccess', { gameId, cards }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

// Play Again
export const playAgain = (gameId) => (dispatch) => {
  const socket = socketService.getSocket();

  return new Promise((resolve, reject) => {
    socket.emit('restartGame', { gameId }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(response.message);
      }
    });
  });
};

