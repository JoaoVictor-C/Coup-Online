import { FETCH_GAME_SUCCESS, FETCH_GAME_ERROR, JOIN_GAME_SUCCESS, JOIN_GAME_ERROR, UPDATE_GAME } from '../actions/actionTypes';

const initialState = {
  games: [],
  currentGame: null,
  loading: false,
  error: null,
};

const gameReducer = (state = initialState, action) => {
  switch(action.type) {
    case FETCH_GAME_SUCCESS:
      return {
        ...state,
        currentGame: action.payload,
        loading: false,
        error: null,
      };
    case FETCH_GAME_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case JOIN_GAME_SUCCESS:
      return {
        ...state,
        currentGame: { ...state.currentGame, ...action.payload },
        loading: false,
        error: null,
      };
    case JOIN_GAME_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case UPDATE_GAME:
      return {
        ...state,
        currentGame: action.payload,
      };
    default:
      return state;
  }
};

export default gameReducer;