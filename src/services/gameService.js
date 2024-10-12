const Game = require('../models/Game');
const User = require('../models/User');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');

// Utility Functions
const shuffleArray = (array) => {
    // Fisher-Yates Shuffle for better randomness
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Initialize the Deck based on player count
const initializeDeck = (playerCount) => {
    const roles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
    const deck = [];

    const cardsPerRole = playerCount <= 4 ? 2 : 3;

    roles.forEach(role => {
        for (let i = 0; i < cardsPerRole; i++) {
            deck.push(role);
        }
    });

    return shuffleArray(deck);
};

const removeRandomCharacter = (player) => {
    if (!player) {
        console.error('removeRandomCharacter: Player is undefined or null.');
        return player;
    }

    if (!player.characters || player.characters.length === 0) {
        console.warn(`removeRandomCharacter: Player ${player.username} has no characters to remove.`);
        return player;
    }

    const randomIndex = Math.floor(Math.random() * player.characters.length);
    const removedCharacter = player.characters.splice(randomIndex, 1)[0];

    player.deadCharacters = player.deadCharacters || [];
    player.deadCharacters.push(removedCharacter);

    if (player.characters.length === 0) {
        player.isAlive = false;
        console.log(`Player ${player.username} has been eliminated from the game.`);
    }

    return player;
};

const checkGameOver = async (game) => {
    try {
        const freshGame = await Game.findById(game._id)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            })
            .lean(); // Use lean for read-only

        const alivePlayers = freshGame.players.filter(player => player.isAlive);

        if (alivePlayers.length <= 1 && freshGame.status === 'in_progress' && freshGame.players.length !== 1) {
            const winner = alivePlayers.length === 1 ? alivePlayers[0].username : null;

            await Game.findByIdAndUpdate(game._id, {
                status: 'finished',
                winner: winner,
                acceptedPlayers: []
            });

            if (winner) {
                console.log(`Game Over! Winner: ${winner}`);
            } else {
                console.log('Game Over! No winners.');
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error('Error in checkGameOver:', error);
        return false;
    }
};

const emitGameUpdate = async (gameId, io) => {
    try {
        const gameState = await Game.findById(gameId)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            })
            .lean(); // Use lean for read-only

        if (!gameState) {
            console.warn(`Game ${gameId} not found during emitGameUpdate.`);
            return;
        }

        const isGameOver = await checkGameOver(gameState);

        if (isGameOver) {
            clearActionTimeout(gameId);
        }

        const room = io.sockets.adapter.rooms.get(gameId.toString());
        if (room) {
            const formattedGame = formatGameData(gameState);
            io.to(gameId.toString()).emit('gameUpdate', formattedGame);
        } else {
            console.warn(`Attempted to emit to room ${gameId}, but it does not exist or has no members.`);
        }
    } catch (error) {
        console.error('Error emitting gameUpdate:', error);
    }
};

const addUserToGame = async (game, playerProfile) => {
    try {
        if (game.players.length >= game.maxPlayers) {
            return { success: false, message: 'Game is full', status: 400 };
        }

        game.players.push({
            playerProfile: playerProfile._id,
            username: playerProfile.username,
            coins: playerProfile.coins,
            characters: playerProfile.characters,
            deadCharacters: playerProfile.deadCharacters,
            isAlive: playerProfile.isAlive,
            isConnected: playerProfile.isConnected,
        });

        await game.save();

        return { success: true, game };
    } catch (error) {
        console.error('Error adding user to game:', error);
        return { success: false, message: 'Server Error', status: 500 };
    }
};

// Add this function to handle user reconnection
const handleReconnection = async (gameId, userId, io, socket) => {
    try {
        const game = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });

        if (game) {
            const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
            if (player) {
                player.isConnected = true;
                await game.save();
                await emitGameUpdate(gameId, io);
                socket.join(gameId.toString());
                io.to(gameId.toString()).emit('playerReconnected', { userId, message: 'Player has reconnected.' });
            }
        }
    } catch (error) {
        console.error('Error handling reconnection:', error);
    }
};

// Export functions
module.exports = {
    initializeDeck,
    shuffleArray,
    removeRandomCharacter,
    checkGameOver,
    emitGameUpdate,
    addUserToGame,
    handleReconnection,
    // ... other exports
};