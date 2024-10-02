import { combineReducers, applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/authReducer';
import gameReducer from './reducers/gameReducer';
// Import other reducers as needed

const rootReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  // Add more reducers here
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;