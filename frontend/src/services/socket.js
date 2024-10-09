import { io } from 'socket.io-client';
import store from '../store';
import { gameUpdate, gameOver, playerDisconnected, gameStarted, updateLastAction } from '../store/actions/gameActions';

const SOCKET_IO_URL = import.meta.env.DEV
  ? import.meta.env.VITE_SOCKET_IO_URL_DEVELOPMENT || 'http://localhost:5001'
  : import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:5001';

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

      this.socket.on('lastAction', ({ username, action, targetUserId, userId, message }) => {
        store.dispatch(updateLastAction(username, action, targetUserId, userId, message));
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

  /**
   * Emit an event with a timeout.
   * @param {string} event - The event name.
   * @param {object} data - The data to send.
   * @param {number} timeout - Timeout in milliseconds.
   * @returns {Promise} - Resolves with response or rejects on timeout/error.
   */
  emitWithTimeout(event, data, timeout = 3000) {
    return new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, timeout);

      this.socket.emit(event, data, (response) => {
        clearTimeout(timeoutId);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message || 'Error in response'));
        }
      });

      // Handle socket errors
      this.socket.once('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }
}

const socketService = new SocketService();
export default socketService;