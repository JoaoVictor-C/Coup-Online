import { getSocket } from '../../services/socket';
import { FETCH_GAME_SUCCESS, FETCH_GAME_ERROR, JOIN_GAME_SUCCESS, JOIN_GAME_ERROR, UPDATE_GAME, CREATE_GAME_SUCCESS, CREATE_GAME_ERROR, PLAYER_DISCONNECTED, GAME_OVER, START_GAME_SUCCESS, START_GAME_ERROR, GAME_STARTED, GAME_UPDATE, CHALLENGE_ACTION, CHALLENGE_FAILURE, BLOCK_ACTION, BLOCK_FAILURE } from './actionTypes';
import api from '../../services/api'; // If you prefer using the api service


// Fetch Game State
export const fetchGame = (gameId) => async (dispatch, getState) => {
  dispatch({ type: 'FETCH_GAME_START' });
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
export const joinGame = (gameId) => async (dispatch) => {
  try {
    console.log('Joining game with ID:', gameId);
    const res = await api.post('/game/join', { gameId });
    
    // Check if the user is already in the game
    if (res.data.message === 'User is already in the game') {
      console.log('User is already in the game');
      dispatch({ type: JOIN_GAME_SUCCESS, payload: res.data.game });
      return { gameId: res.data.game._id, status: res.data.game.status };
    }
    
    dispatch({ type: JOIN_GAME_SUCCESS, payload: res.data });
    if (res.data.status === 'in_progress') {
      // If the game has started, fetch the initial game state
      dispatch(fetchGame(gameId));
    }
    return { gameId: res.data._id, status: res.data.status };
  } catch (error) {
    dispatch({ type: JOIN_GAME_ERROR, payload: error.response?.data?.message || 'Error joining game' });
    return { gameId: null, error: error.response?.data?.message || 'Error joining game' };
  }
};

// Make Player Action via Socket.io
export const performAction = (gameId, actionType, targetUserId, userId) => async (dispatch) => {
  try {
    dispatch({ type: 'ACTION_START' });

    const socket = getSocket();
    console.log('Performing action:', { gameId, actionType, targetUserId, userId });
    socket.emit('action', { gameId, actionType, targetUserId, userId });

    return { success: true, message: 'Action performed successfully' };
  } catch (error) {
    console.error('Action Error:', error);
    const errorMessage = error.response?.data?.message || 'Error performing action';
    dispatch({ type: 'ACTION_ERROR', payload: errorMessage });
    throw error;
  }
};

// Update Game (from Socket)
export const updateGame = (updatedGame) => ({
  type: UPDATE_GAME,
  payload: updatedGame,
});

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

// New Action: Player Disconnected
export const playerDisconnected = (userId, reason) => ({
  type: PLAYER_DISCONNECTED,
  payload: { userId, reason },
});

// New Action: Game Over
export const gameOver = (winner) => ({
  type: GAME_OVER,
  payload: { winner },
});

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

// Accept Action
export const acceptAction = (gameId) => async (dispatch) => {
  try {
    const socket = getSocket();
    socket.emit('acceptAction', { gameId });
    return { success: true };
  } catch (error) {
    console.error('Accept Action Error:', error);
    return { success: false, message: error.message };
  }
};

// Perform Challenge
export const performChallenge = (gameId, challengerId) => async (dispatch) => {
  try {
    const socket = getSocket();
    dispatch({ type: CHALLENGE_ACTION, payload: { gameId, challengerId } });
    socket.emit('challenge', { gameId, challengerId });
    return { success: true };
  } catch (error) {
    console.error('Challenge Error:', error);
    dispatch({ type: CHALLENGE_FAILURE, payload: error.message });
    return { success: false, message: error.message };
  }
};

// Perform Block
export const performBlock = (gameId, blockerId, actionType) => async (dispatch) => {
  try {
    const socket = getSocket();
    dispatch({ type: BLOCK_ACTION, payload: { gameId, blockerId, actionType } });
    socket.emit('block', { gameId, blockerId, actionType });
    return { success: true };
  } catch (error) {
    console.error('Block Error:', error);
    dispatch({ type: BLOCK_FAILURE, payload: error.message });
    return { success: false, message: error.message };
  }
};