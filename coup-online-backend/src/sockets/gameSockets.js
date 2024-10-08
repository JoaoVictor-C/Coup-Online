const Game = require('../models/Game');
const { emitGameUpdate } = require('../services/gameService');

const { handleCreateGame } = require('../handlers/createGameHandler');
const { handleJoinGame } = require('../handlers/joinGameHandler');
const { handleGetGame } = require('../handlers/getGameHandler');
const { handleRestartGame } = require('../handlers/restartGameHandler');
const { handleStartGame } = require('../handlers/startGameHandler');
const { handleAction, handleAcceptAction } = require('../handlers/actionHandler');
const { handleExchangeAction, handleSelectExchangeCards } = require('../handlers/exchangeHandler');
const { handleBlockAction, handleRespondToBlock } = require('../handlers/blockHandler');
const { handleChallengeAction, handleChallengeSuccess } = require('../handlers/challengeHandler');

const connectedUsers = {}; // To track userId to socket.id
const userGames = {}; // To track socket.id to gameId


const gameSockets = (io, socket) => {
    // Create a game
    socket.on('createGame', async ({ playerCount }, callback) => {
        return await handleCreateGame(io, socket, playerCount, callback, connectedUsers, userGames);
    });

    // Join a game room
    socket.on('joinGame', async ({ roomName }, callback) => {
        return await handleJoinGame(io, socket, roomName, callback, connectedUsers, userGames);
    });

    // Handle Get Game Request
    socket.on('getGame', async ({ roomName, userId }, callback) => {
        return await handleGetGame(io, socket, roomName, userId, callback);
    });

    // Handle Restart Game
    socket.on('restartGame', async ({ gameId }, callback) => {
        const response = await handleRestartGame(io, socket, gameId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        const gameId = userGames[socket.id];
        const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        if (gameId && userId) {
            try {
                const game = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
                if (game) {
                    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
                    if (player) {
                        player.isConnected = false;
                        if (game.players.filter(p => p.isAlive && p.isConnected).length <= 1) {
                            game.status = 'finished';
                            game.winner = game.players.find(p => p.isAlive && p.isConnected)?.playerProfile.user.username;
                        }
                        await game.save();

                        await emitGameUpdate(gameId, io);
                        io.to(gameId).emit('playerDisconnected', { userId, reason });

                        // Cleanup
                        delete userGames[socket.id];
                        delete connectedUsers[userId];
                        const room = io.sockets.adapter.rooms.get(gameId);
                        if (!room || room.size === 0) {
                            await Game.findByIdAndDelete(gameId);
                            console.log(`Game ${gameId} deleted as no users are in the room`);
                        }
                    }
                }
            } catch (err) {
                console.error('Error handling disconnection:', err);
            }
        }
    });

    // Start Game Event
    socket.on('startGame', async ({ gameId }, callback) => {
        const response = await handleStartGame(io, socket, gameId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    // Start of Selection
    // Handle Action
    socket.on('action', async ({ gameId, actionType, targetUserId }, callback) => {
        const response = await handleAction(io, socket, gameId, actionType, targetUserId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    socket.on('exchange', async ({ gameId }, callback) => {
        const response = await handleExchangeAction(io, socket, gameId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });
    
    // Handle Selection of Exchange Cards
    socket.on('selectExchangeCards', async ({ gameId, selectedCards }, callback) => {
        const response = await handleSelectExchangeCards(io, socket, gameId, selectedCards, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    // Handle Block
    socket.on('block', async ({ gameId, actionType, blockerId }, callback) => {
        const response = await handleBlockAction(io, socket, gameId, actionType, blockerId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    // Handle Challenge
    socket.on('challenge', async ({ gameId }, callback) => {
        const response = await handleChallengeAction(io, socket, gameId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    // Handle Respond to Block
    socket.on('respondToBlock', async ({ gameId, response }, callback) => {
        const handlerResponse = await handleRespondToBlock(io, socket, gameId, response, callback);
        await emitGameUpdate(gameId, io);
        return handlerResponse;
    });

    // Handle Accept Action (No challenges or blocks)
    socket.on('acceptAction', async ({ gameId }, callback) => {
        const response = await handleAcceptAction(io, socket, gameId, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });

    socket.on('challengeSuccess', async ({ gameId, cards }, callback) => {
        const response = await handleChallengeSuccess(io, socket, gameId, cards, callback);
        await emitGameUpdate(gameId, io);
        return response;
    });
};

module.exports = { gameSockets, connectedUsers, userGames };