import { io } from 'socket.io-client';
import store from '../store';
import {
  CHALLENGE_SUCCESS,
  CHALLENGE_FAILURE,
  BLOCK_SUCCESS,
  BLOCK_FAILURE,
  ACTION_EXECUTED_SUCCESS,
  ACTION_EXECUTED_FAILURE
} from '../store/actions/actionTypes';
import { gameUpdate, gameOver, playerDisconnected, gameStarted, pendingAction } from '../store/actions/gameActions';

const SOCKET_IO_URL = import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:5001';

class SocketService {
  socket = null;

  initializeSocket() {
    if (!this.socket) {
      this.socket = io(SOCKET_IO_URL, {
        transports: ['websocket'],
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from socket server:', reason);
      });

      // Centralized event listeners
      this.socket.on('gameUpdate', (updatedGame) => {
        store.dispatch(gameUpdate(updatedGame));
      });

      this.socket.on('gameOver', ({ winner }) => {
        store.dispatch(gameOver(winner));
      });

      this.socket.on('playerDisconnected', ({ gameId, userId }) => {
        store.dispatch(playerDisconnected(gameId, userId));
      });

      this.socket.on('gameStarted', ({ gameId, currentPlayerIndex, players }) => {
        store.dispatch(gameStarted(gameId, currentPlayerIndex, players));
      });

      this.socket.on('pendingAction', (data) => {
        const { game } = data;
        store.dispatch(pendingAction(game));
      });

      this.socket.on('challengeResult', (data) => {
        const { success, message } = data;
        if (success) {
          store.dispatch({ type: CHALLENGE_SUCCESS, payload: message });
        } else {
          store.dispatch({ type: CHALLENGE_FAILURE, payload: message });
        }
      });

      this.socket.on('blockResult', (data) => {
        const { success, message, game } = data;
        if (success) {
          store.dispatch({ type: BLOCK_SUCCESS, payload: message });
          store.dispatch(gameUpdate(game));
        } else {
          store.dispatch({ type: BLOCK_FAILURE, payload: message });
        }
      });

      this.socket.on('actionExecuted', (data) => {
        const { success, message, game } = data;
        if (success) {
          store.dispatch({ type: ACTION_EXECUTED_SUCCESS, payload: { message, game } });
        } else {
          store.dispatch({ type: ACTION_EXECUTED_FAILURE, payload: { message, game } });
        }
      });

      this.socket.on('blockAttempt', (data) => {
        const { success, message, game } = data;
        if (success) {
          console.log('Block attempt success')
          store.dispatch(gameUpdate(game));
        }
      });

      this.socket.on('blockChallengeResult', (data) => {
        const { success, message, game } = data;
        store.dispatch(gameUpdate(game));
        // You might want to dispatch an action to show a message to the user
      });

      // Add more listeners as needed
    }
  }

  getSocket() {
    if (!this.socket) {
      this.initializeSocket();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;