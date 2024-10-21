import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@utils/constants';
import { ActionResponse, Game, GameAction } from '@utils/types';

class GameHub {
    private connection: HubConnection | null = null;

    constructor(token: string) {
        this.connection = new HubConnectionBuilder()
            .withUrl(`${SIGNALR_HUB_URL}?access_token=${token}`)
            .withAutomaticReconnect()
            .build();
    }

    public async connect() {
        try {
            await this.connection?.start();
            console.log('Connected to GameHub');
        } catch (err) {
            console.error('Connection failed:', err);
        }
    }

    public async disconnect() {
        try {
            await this.connection?.stop();
            console.log('Disconnected from GameHub');
        } catch (err) {
            console.error('Error disconnecting:', err);
        }
    }

    public on(eventName: string, callback: (...args: any[]) => void) {
        this.connection?.on(eventName, callback);
    }

    public off(eventName: string, callback?: (...args: any[]) => void) {
        if (callback) {
            this.connection?.off(eventName, callback);
        } else {
            this.connection?.off(eventName);
        }
    }

    public async performAction(gameId: string, actionType: string, targetUserId?: string) {
        try {
            console.log('Performing action:', actionType, 'with target:', targetUserId);
            await this.connection?.invoke('PerformAction', gameId, actionType, targetUserId);
        } catch (err) {
            console.error('Action invocation error:', err);
        }
    }

    public async switchToSpectator(gameId: string) {
        try {
            await this.connection?.invoke('SwitchToSpectator', gameId);
        } catch (err) {
            console.error('Failed to switch to spectator:', err);
        }
    }

    public async reconnect(gameId: string) {
        try {
            await this.connection?.invoke('Reconnect', gameId);
        } catch (err) {
            console.error('Reconnect failed:', err);
        }
    }

    public async startGame(gameId: string) {
        try {
            await this.connection?.invoke('StartGame', gameId);
        } catch (err) {
            console.error('Failed to start game:', err);
        }
    }

    public async rejoinAsPlayer(gameId: string) {
        try {
            await this.connection?.invoke('RejoinAsPlayer', gameId);
        } catch (err) {
            console.error('Failed to rejoin as player:', err);
        }
    }

    public async getGameState(gameId: string) {
        try {
            return await this.connection?.invoke('GetGameState', gameId);
        } catch (err) {
            console.error('Failed to get game state:', err);
            return null;
        }
    }

    public async respondToPendingAction(gameId: string, response: ActionResponse, blockOption?: string) {
        try {
            await this.connection?.invoke('RespondToPendingAction', gameId, response.toLowerCase(), blockOption);
        } catch (err) {
            console.error('Failed to respond to pending action:', err);
        }
    }

    public async respondToReturnCard(gameId: string, cardId: string) {
        try {
            await this.connection?.invoke('RespondToReturnCard', gameId, cardId);
        } catch (err) {
            console.error('Failed to respond to return card:', err);
        }
    }

    public async respondToBlock(gameId: string, isChallenge: boolean) {
        try {
            console.log('Responding to block:', gameId, isChallenge);
            await this.connection?.invoke('RespondToBlock', gameId, isChallenge);
        } catch (err) {
            console.error('Failed to respond to block:', err);
        }
    }

    public async respondToExchangeSelect(gameId: string, card1: string, card2: string) {
        try {
            await this.connection?.invoke('RespondToExchangeSelect', gameId, card1, card2);
        } catch (err) {
            console.error('Failed to respond to exchange select:', err);
        }
    }

    public async restartGame(game: Game) {
        try {
            await this.connection?.invoke('RestartGame', game.id);
        } catch (err) {
            console.error('Failed to restart game:', err);
        }
    }

    public async returnToLobby(gameId: string) {
        try {
            await this.connection?.invoke('ReturnToLobby', gameId);
        } catch (err) {
            console.error('Failed to return to lobby:', err);
        }
    }
}

export default GameHub;
