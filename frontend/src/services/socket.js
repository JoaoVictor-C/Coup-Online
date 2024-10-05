import { io } from 'socket.io-client';
import store from '../store';
import {
  GAME_UPDATE,
  GAME_OVER,
  PLAYER_DISCONNECTED,
  GAME_STARTED,
  PENDING_ACTION,
} from '../store/actions/actionTypes';
import { gameUpdate, gameOver, playerDisconnected, gameStarted, pendingAction } from '../store/actions/gameActions';

const SOCKET_IO_URL = import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:5001';

class SocketService {
  socket = null;
  actionTimeouts = {};

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
        const { success, message, game } = data;
        if (success) {
          store.dispatch({ type: 'CHALLENGE_SUCCESS', payload: message });
          store.dispatch(gameUpdate(game));
        } else {
          store.dispatch({ type: 'CHALLENGE_FAILURE', payload: message });
        }
      });

      this.socket.on('blockResult', (data) => {
        const { success, message, game } = data;
        if (success) {
          store.dispatch({ type: 'BLOCK_SUCCESS', payload: message });
          store.dispatch(gameUpdate(game));
        } else {
          store.dispatch({ type: 'BLOCK_FAILURE', payload: message });
        }
      });

      this.socket.on('actionExecuted', (data) => {
        const { success, message, game } = data;
        if (success) {
          store.dispatch({ type: 'ACTION_EXECUTED_SUCCESS', payload: { message, game } });
        } else {
          store.dispatch({ type: 'ACTION_EXECUTED_FAILURE', payload: { message, game } });
        }
      });

      this.socket.on('blockAttempt', (data) => {
        const { success, message, game } = data;
        if (success) {
          console.log('Block attempt success');
          store.dispatch(gameUpdate(game));
        }
      });

      this.socket.on('blockChallengeResult', (data) => {
        const { success, message, game } = data;
        store.dispatch(gameUpdate(game));
        // Optionally dispatch an action to show a message to the user
      });
    }
  }

  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
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
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Manage action timeouts
  setActionTimeout(gameId, callback, delay = 30000) { // Default 30 seconds
    this.clearActionTimeout(gameId);
    this.actionTimeouts[gameId] = setTimeout(() => {
      callback();
      delete this.actionTimeouts[gameId];
    }, delay);
  }

  clearActionTimeout(gameId) {
    if (this.actionTimeouts[gameId]) {
      clearTimeout(this.actionTimeouts[gameId]);
      delete this.actionTimeouts[gameId];
    }
  }
}

const socketService = new SocketService();
export default socketService;