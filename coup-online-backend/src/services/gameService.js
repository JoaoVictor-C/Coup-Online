const Game = require('../models/Game');
const User = require('../models/User');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');

// Utility Functions
const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
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
    if (player.characters.length > 0) {
        const randomIndex = Math.floor(Math.random() * player.characters.length);
        const removedCharacter = player.characters.splice(randomIndex, 1)[0];
        player.deadCharacters.push(removedCharacter);
        if (player.characters.length === 0) {
            player.isAlive = false;
        }
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
            .lean();

        const alivePlayers = freshGame.players.filter(player => player.isAlive);

        if (alivePlayers.length <= 1 && freshGame.status === 'in_progress' && freshGame.players.length != 1) {
            if (alivePlayers.length === 1) {
                freshGame.winner = alivePlayers[0].username;
                console.log(`Game Over! Winner: ${freshGame.winner}`);
            } else {
                console.log('Game Over! No winners.');
            }

            await Game.findByIdAndUpdate(game._id, {
                status: 'finished',
                winner: alivePlayers.length === 1 ? alivePlayers[0].username : null,
                acceptedPlayers: []
            });

            return true;
        }

        return false;
    } catch (error) {
        console.error('Error in checkGameOver:', error);
        return false;
    }
};

// Game Setup Functions
const formatGameData = (game, userId) => {
    const formattedPlayers = game.players.map(player => {
        const playerId = player.playerProfile.user._id.toString();
        const requestingUserId = userId.toString();

        const formattedPlayer = { ...player };

        if (playerId !== requestingUserId) {
            formattedPlayer.characters = player.characters.map(() => 'hidden');
        }

        return formattedPlayer;
    });

    return {
        ...game,
        players: formattedPlayers,
    };
};

// Game Management Functions
const addUserToGame = async (game, playerProfile) => {
    const user = await User.findById(playerProfile.user);
    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    if (game.players.some(p => p.playerProfile.toString() === playerProfile._id.toString())) {
        return { success: true, status: 200, message: 'User reconnected to the game', game };
    }

    if (game.status !== 'waiting') {
        return { success: false, status: 400, message: 'Cannot join a game that has already started' };
    }

    if (game.players.length >= game.maxPlayers) {
        return { success: false, status: 400, message: 'Game is already full' };
    }

    const characters = game.deck.splice(0, 2);

    game.players.push({
        playerProfile: playerProfile._id,
        username: user.username,
        coins: 2,
        characters,
        isAlive: true,
        isConnected: true,
    });


    await game.save();
    await User.findByIdAndUpdate(user._id, { $push: { games: game._id } });

    const populatedGame = await Game.findById(game._id)
        .populate({
            path: 'players.playerProfile',
            select: 'user username',
            populate: {
                path: 'user',
                select: 'id username'
            }
        })
        .lean();

    const formattedGame = formatGameData(populatedGame, user._id);

    return { success: true, status: 200, message: 'User added to the game', game: formattedGame };
};


const startGameLogic = async (gameId, userId, io) => {
    const game = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    });

    if (!game) {
        return { success: false, status: 404, message: 'Game not found' };
    }

    const isPlayer = game.players.some(player =>
        player.playerProfile &&
        player.playerProfile.user &&
        player.playerProfile.user._id.toString() === userId.toString()
    );

    if (!isPlayer) {
        return { success: false, status: 403, message: 'You are not a player in this game' };
    }

    if (game.status !== 'waiting') {
        return { success: false, status: 400, message: 'Game has already started' };
    }

    if (game.players.length < 2) {
        return { success: false, status: 400, message: 'At least 2 players are required to start the game' };
    }

    game.status = 'in_progress';
    game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
    game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
    await game.save();

    const updatedGame = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    }).lean();

    return { success: true, status: 200, message: 'Game started successfully', game: updatedGame };
};


// Action Handlers
const handleIncome = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 1) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 1;
        player.coins += 1;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Income action successful' };
    }
    return { success: false, message: 'Action failed' };
};

const handleForeignAid = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 2) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 2;
        player.coins += 2;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Foreign Aid action successful' };
    }
    return { success: false, message: 'Action failed' };
};


const handleCoup = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 7) {
        return { success: false, message: 'Not enough coins to perform coup' };
    }
    player.coins -= 7;
    game.centralTreasury += 7;
    removeRandomCharacter(targetPlayer);
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Coup action successful' };
};


const handleTaxes = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 3) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 3;
        player.coins += 3;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Taxes action successful' };
    }
    return { success: false, message: 'Action failed' };
};

const handleAssassinate = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 3) {
        return { success: false, message: 'Not enough coins to perform assassination' };
    }
    player.coins -= 3;
    game.centralTreasury -= 3;
    removeRandomCharacter(targetPlayer);
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Assassinate action successful' };
};


const handleSteal = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    const stolenCoins = Math.min(2, targetPlayer.coins);
    targetPlayer.coins -= stolenCoins;
    player.coins += stolenCoins;
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Steal action successful' };
};


const handleExchange = async (game, userId, selectedCards) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (!player || !player.isAlive) {
        return { success: false, message: 'Player not found or not alive' };
    }

    if (!game.pendingAction || game.pendingAction.type !== 'exchange') {
        return { success: false, message: 'No pending exchange action' };
    }

    const combinedCards = game.pendingAction.exchange.combinedCards;

    // If the player originally has 1 card combinedRule = 3, if 2 combinedRule = 4
    const combinedRule = player.characters.length === 1 ? 3 : 4;

    if (combinedRule === 3 && selectedCards.length !== 1) {
        return { success: false, message: 'You must select 1 card to keep' };
    }
    if (combinedRule === 4 && selectedCards.length !== 2) {
        return { success: false, message: 'You must select 2 cards to keep' };
    }

    if (combinedCards.length !== combinedRule) {
        return { success: false, message: 'Invalid number of cards for exchange' };
    }

    if (!selectedCards || selectedCards.length !== combinedRule-2) {
        return { success: false, message: `You must select ${combinedRule-2} cards to keep` };
    }

    // Validate selected cards
    const isValidSelection = selectedCards.every(card => combinedCards.includes(card));
    if (!isValidSelection) {
        return { success: false, message: 'Invalid card selection' };
    }

    // Update player's characters
    player.characters = selectedCards;

    // Determine the cards to return to the deck
    const cardsToReturn = combinedCards.filter(card => !selectedCards.includes(card));

    // Shuffle and return the unused cards to the deck
    game.deck = shuffleArray([...game.deck, ...cardsToReturn]);

    return { success: true, message: 'Exchange action successful' };
};

// Action Execution
const executeAction = async (game, action) => {
    // Refresh the game state
    const freshGame = await Game.findById(game._id)
        .populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        })
        .lean();

    switch (action.type) {
        case 'income':
            return await handleIncome(freshGame, action.userId);
        case 'foreignAid':
            return await handleForeignAid(freshGame, action.userId);
        case 'coup':
            return await handleCoup(freshGame, action.userId, action.targetUserId);
        case 'taxes':
            return await handleTaxes(freshGame, action.userId);
        case 'assassinate':
            return await handleAssassinate(freshGame, action.userId, action.targetUserId);
        case 'steal':
            return await handleSteal(freshGame, action.userId, action.targetUserId);
        default:
            return { success: false, message: 'Unknown action type' };
    }
};

// Advance turn to the next player
const advanceTurn = (game) => {
    let nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    // Update the players.isAlive:
    game.players.forEach(player => {
        if (player.characters.length === 0) {
            player.isAlive = false;
        }
    });
    while (!game.players[nextPlayerIndex].isAlive) {
        console.log(`Player: ${game.players[nextPlayerIndex].username} is not alive`)
        nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
    }
    game.currentPlayerIndex = nextPlayerIndex;
    game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
    return game;
};

// Helper function to emit game updates
const emitGameUpdate = async (gameId, io) => {
    try {
        // Fetch the latest game state
        const gameState = await Game.findById(gameId)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            })
            .lean();

        if (!gameState) {
            console.warn(`Game ${gameId} not found during emitGameUpdate.`);
            return;
        }
        await checkGameOver(gameState);
        
        if (gameState.status === 'finished') {
            clearActionTimeout(gameId);
        }
        const room = io.sockets.adapter.rooms.get(gameId.toString());
        if (room) {
            for (const socketId of room) {
                const socketToEmit = io.sockets.sockets.get(socketId);
                if (socketToEmit && socketToEmit.user && socketToEmit.user.id) {
                    const formattedGame = formatGameData(gameState, socketToEmit.user.id);
                    socketToEmit.emit('gameUpdate', formattedGame);
                }
            }
        } else {
            console.warn(`Attempted to emit to room ${gameId}, but it does not exist or has no members.`);
        }
    } catch (error) {
        console.error('Error emitting gameUpdate:', error);
    }
};

// Export functions
module.exports = {
    handleIncome,
    handleForeignAid,
    handleCoup,
    handleTaxes,
    handleAssassinate,
    handleSteal,
    handleExchange,
    initializeDeck,
    shuffleArray,
    checkGameOver,
    removeRandomCharacter,
    executeAction,
    advanceTurn,
    emitGameUpdate,
    addUserToGame,
    startGameLogic,
    formatGameData
};