import { io } from 'socket.io-client';
import store from '../store';
import { updateGame, gameOver, playerDisconnected, gameStarted } from '../store/actions/gameActions';
import { CHALLENGE_SUCCESS, CHALLENGE_FAILURE, BLOCK_SUCCESS, BLOCK_FAILURE } from '../store/actions/actionTypes';

const SOCKET_IO_URL = import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:5000';

let socket = null;

const initializeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_IO_URL, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    socket.on('gameUpdate', (updatedGame) => {
      store.dispatch(updateGame(updatedGame));
    });

    socket.on('gameOver', ({ winner }) => {
      store.dispatch(gameOver(winner));
    });

    socket.on('playerDisconnected', ({ userId, reason }) => {
      store.dispatch(playerDisconnected(userId, reason));
    });

    socket.on('gameStarted', ({ gameId, currentPlayerIndex, players }) => {
      store.dispatch(gameStarted(gameId, currentPlayerIndex, players));
    });

    socket.on('challengeResult', (data) => {
      const { success, message } = data;
      if (success) {
        store.dispatch({ type: CHALLENGE_SUCCESS, payload: message });
      } else {
        store.dispatch({ type: CHALLENGE_FAILURE, payload: message });
      }
    });

    socket.on('blockResult', (data) => {
      const { success, message } = data;
      if (success) {
        store.dispatch({ type: BLOCK_SUCCESS, payload: message });
      } else {
        store.dispatch({ type: BLOCK_FAILURE, payload: message });
      }
    });

    // Additional event listeners can be added here
  }
};

const getSocket = () => {
  if (!socket) {
    initializeSocket();
  }
  return socket;
};

export { getSocket, initializeSocket };