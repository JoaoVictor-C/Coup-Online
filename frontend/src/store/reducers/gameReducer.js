import {
  FETCH_GAME_SUCCESS,
  FETCH_GAME_ERROR,
  JOIN_GAME_SUCCESS,
  JOIN_GAME_ERROR,
  CREATE_GAME_SUCCESS,
  CREATE_GAME_ERROR,
  FETCH_GAME_START,
  PLAYER_DISCONNECTED,
  GAME_OVER,
  START_GAME_SUCCESS,
  START_GAME_ERROR,
  GAME_STARTED,
  GAME_UPDATE,
  CHALLENGE_ACTION,
  CHALLENGE_SUCCESS,
  CHALLENGE_FAILURE,
  BLOCK_ACTION,
  BLOCK_SUCCESS,
  BLOCK_FAILURE,
  ACCEPT_ACTION_SUCCESS,
  ACCEPT_ACTION_FAILURE,
  PENDING_ACTION,
  ACTION_EXECUTED_SUCCESS,
  ACTION_EXECUTED_FAILURE,
} from '../actions/actionTypes';

const initialState = {
  currentGame: null,
  loading: false,
  error: null,
  challenge: {
    isChallenging: false,
    success: null,
    message: '',
  },
  block: {
    isBlocking: false,
    success: null,
    message: '',
  },
};

const gameReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_GAME_SUCCESS:
      return {
        ...state,
        currentGame: {
          ...action.payload,
          players: action.payload.players.map(player => ({
            ...player,
            user: player.playerProfile.user || {},
            username: player.playerProfile.user?.username || 'Unknown',
            characters: player.characters,
            coins: player.coins,
            isAlive: player.isAlive,
            isConnected: player.isConnected
          })),
          currentUserId: state.currentGame?.currentUserId || action.payload.currentUserId,
          centralTreasury: action.payload.centralTreasury || 1000,
          currentPlayerUsername: action.payload.currentPlayerUsername || '',
          winner: action.payload.winner || null,
          pendingAction: action.payload.pendingAction || null,
        },
        loading: false,
        error: null,
      };
    case JOIN_GAME_SUCCESS:
    case CREATE_GAME_SUCCESS:
      return {
        ...state,
        currentGame: action.payload,
        loading: false,
        error: null,
      };
    case FETCH_GAME_ERROR:
    case JOIN_GAME_ERROR:
    case CREATE_GAME_ERROR:
    case START_GAME_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case FETCH_GAME_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case GAME_UPDATE:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          ...action.payload,
          players: action.payload.players.map(player => ({
            ...player,
            user: player.playerProfile.user || {},
            username: player.playerProfile.user?.username || 'Unknown',
            characters: player.characters,
            coins: player.coins,
            isAlive: player.isAlive,
            isConnected: player.isConnected
          })),
          currentUserId: action.payload.currentUserId,
          currentPlayerUsername: action.payload.currentPlayerUsername,
          winner: action.payload.winner,
          pendingAction: action.payload.pendingAction,
          
        },
      };
    case PLAYER_DISCONNECTED:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          players: state.currentGame.players.map(player =>
            player.playerProfile.user._id === action.payload.userId
              ? { ...player, isConnected: false }
              : player
          ),
        },
      };
    case GAME_OVER:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          status: 'finished',
          winner: action.payload,
        },
      };
    case START_GAME_SUCCESS:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          ...action.payload,
          status: 'in_progress',
        },
        loading: false,
        error: null,
      };
    case GAME_STARTED:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          status: 'in_progress',
          currentPlayerIndex: action.payload.currentPlayerIndex,
          players: action.payload.players,
        },
      };
    case CHALLENGE_ACTION:
      return {
        ...state,
        challenge: {
          isChallenging: true,
          success: null,
          message: '',
        },
      };
    case CHALLENGE_SUCCESS:
      return {
        ...state,
        challenge: {
          isChallenging: false,
          success: true,
          message: action.payload,
        },
      };
    case CHALLENGE_FAILURE:
      return {
        ...state,
        challenge: {
          isChallenging: false,
          success: false,
          message: action.payload,
        },
      };
    case BLOCK_ACTION:
      return {
        ...state,
        block: {
          isBlocking: true,
          success: null,
          message: '',
        },
      };
    case BLOCK_SUCCESS:
      return {
        ...state,
        block: {
          isBlocking: false,
          success: true,
          message: action.payload,
        },
        currentGame: {
          ...state.currentGame,
          pendingAction: null,
        },
      };
    case BLOCK_FAILURE:
      return {
        ...state,
        block: {
          isBlocking: false,
          success: false,
          message: action.payload,
        },
      };
    case ACCEPT_ACTION_SUCCESS:
    case ACCEPT_ACTION_FAILURE:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          pendingAction: null,
        },
      };
    case PENDING_ACTION:
      return {
        ...state,
        currentGame: action.payload,
      };
    case ACTION_EXECUTED_SUCCESS:
      return {
        ...state,
        currentGame: action.payload.game,
      };
    case ACTION_EXECUTED_FAILURE:
      return {
        ...state,
        error: action.payload.message,
        currentGame: action.payload.game,
      };
    default:
      return state;
  }
};

export default gameReducer;