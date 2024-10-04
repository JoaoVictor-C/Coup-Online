import { AUTH_START, AUTH_SUCCESS, AUTH_ERROR, LOGOUT, GET_PROFILE } from '../actions/actionTypes';

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: false,
  user: null,
  userId: null,
  error: null,
};

const authReducer = (state = initialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case AUTH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case AUTH_SUCCESS:
      return {
        ...state,
        token: payload.token,
        isAuthenticated: true,
        loading: false,
        user: payload.user,
        userId: payload.user._id,
        error: null,
      };
    case GET_PROFILE:
      return {
        ...state,
        user: payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        userId: payload.user._id,
      };
    case AUTH_ERROR:
    case LOGOUT:
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: payload,
        userId: null,
      };
      default:
        return state;
  }
};

export default authReducer;