const Game = require('../models/Game');
const { emitGameUpdate, removeRandomCharacter, advanceTurn, executeAction } = require('../services/gameService');
const { getBlockingRoles } = require('../services/actionService');
const { clearActionTimeout } = require('../services/timerService');

const handleBlockAction = async (io, socket, gameId, actionType, blockerId, callback) => {
    try {
        const userId = socket.user.id;
        const game = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });

        if (!game || !game.pendingAction) {
            return callback?.({ success: false, message: 'No pending action to block' });
        }

        const action = game.pendingAction;

        // Ensure the action can be blocked
        if (!action.canBeBlocked || action.type !== actionType) {
            return callback?.({ success: false, message: 'This action cannot be blocked' });
        }

        // Verify that the blocker is not the acting player
        if (action.userId === blockerId) {
            return callback?.({ success: false, message: 'You cannot block your own action' });
        }

        // Verify that the blocker is a valid player
        const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());
        if (!blocker || !blocker.isAlive) {
            return callback?.({ success: false, message: 'Blocker not found or not alive' });
        }

        // Add blocker to the list of blockers if not already blocked
        if (!action.blockers.includes(blockerId)) {
            action.blockers.push(blockerId);
            action.blockPending = true;  // Add this flag to indicate a pending block
            await game.save();
            await emitGameUpdate(gameId, io);
            io.to(gameId).emit('lastAction', {
                username: blocker.playerProfile.user.username,
                userId: blocker.playerProfile.user._id.toString(),
                action: 'block',
                targetUserId: action.userId.toString(),
                message: `Attempted to block ${actionType} action.`,
            });

            callback?.({ success: true, message: 'Block attempted, waiting for acting player response' });
        } else {
            return callback?.({ success: false, message: 'Action already blocked by this user' });
        }
    } catch (error) {
        console.error('Block Error:', error);
        callback?.({ success: false, message: 'Server Error during block', error: error.message });
    }
}

const handleRespondToBlock = async (io, socket, gameId, actionType, response, callback) => {
    try {
        const userId = socket.user.id;
        const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
        });

        if (!game || !game.pendingAction || !game.pendingAction.blockPending) {
            return callback?.({ success: false, message: 'No pending block to respond to' });
        }

        const action = game.pendingAction;

        const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
        if (!player || !player.isAlive) {
            return callback?.({ success: false, message: 'Player not found or not alive' });
        }

        // Clear the timeout as the user is responding to the block
        clearActionTimeout(gameId);

        if (response === 'challenge') {
            // Initiate a challenge against the first blocker]
            const blockerId = action.blockers[0];
            const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());
            if (!blocker || !blocker.isAlive) {
                return callback?.({ success: false, message: 'Blocker not found or not alive' });
            }

            // Check if blocker has the required role
            const requiredRoles = getBlockingRoles(action.type);
            const hasRole = blocker.characters.some(char => requiredRoles.includes(char));

            if (hasRole) {
                // Challenger loses an influence
                const challenger = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
                if (challenger) {
                    removeRandomCharacter(challenger);
                }

                // The block succeeds
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();

                await emitGameUpdate(gameId, io);
                io.to(gameId).emit('lastAction', {
                    username: blocker.playerProfile.user.username,
                    userId: blocker.playerProfile.user._id.toString(),
                    action: 'challenge',
                    targetUserId: actionType,
                    message: `Challenged the block on ${actionType} action.`,
                });
            } else {
                // Blocker loses an influence
                removeRandomCharacter(blocker);

                // The original action proceeds
                const result = await executeAction(game, action);
                if (result.success) {
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();

                    await emitGameUpdate(gameId, io);

                    io.to(gameId).emit('lastAction', {
                        username: blocker.playerProfile.user.username,
                        userId: blocker.playerProfile.user._id.toString(),
                        action: actionType,
                        targetUserId: null,
                    });
                }
            }

            callback?.({ success: true, message: 'Response to block processed' });
        } else if (response === 'accept') {
            // Block is accepted, cancel the original action
            game.pendingAction = null;
            advanceTurn(game);
            await game.save();

            await emitGameUpdate(gameId, io);
            io.to(gameId).emit('lastAction', {
                username: player.playerProfile.user.username,
                userId: player.playerProfile.user._id.toString(),
                action: 'acceptBlock',
                targetUserId: null,
                message: `Accepted the block on ${actionType} action.`,
            });

            callback?.({ success: true, message: 'Response to block processed' });
        } else {
            return callback?.({ success: false, message: 'Invalid response to block' });
        }
    } catch (error) {
        console.error('Respond to Block Error:', error);
        callback?.({ success: false, message: 'Server Error during block response', error: error.message });
    }
}

module.exports = {
    handleBlockAction,
    handleRespondToBlock
};