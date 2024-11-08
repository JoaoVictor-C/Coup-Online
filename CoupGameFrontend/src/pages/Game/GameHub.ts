import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
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

    private async ensureConnected(): Promise<boolean> {
        if (this.connection?.state === HubConnectionState.Connected) {
            return true;
        }
        try {
            await this.connect();
            return this.connection?.state !== HubConnectionState.Disconnected;
        } catch (err) {
            console.error('Failed to reconnect:', err);
            return false;
        }
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
        if (await this.ensureConnected()) {
            try {
                console.log('Performing action:', actionType, 'with target:', targetUserId);
                await this.connection?.invoke('PerformAction', gameId, actionType, targetUserId);
            } catch (err) {
                console.error('Action invocation error:', err);
            }
        } else {
            console.error('Cannot perform action: not connected to GameHub.');
        }
    }

    public async switchToSpectator(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('SwitchToSpectator', gameId);
            } catch (err) {
                console.error('Failed to switch to spectator:', err);
            }
        } else {
            console.error('Cannot switch to spectator: not connected to GameHub.');
        }
    }

    public async reconnect(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('Reconnect', gameId);
            } catch (err) {
                console.error('Reconnect failed:', err);
            }
        } else {
            console.error('Cannot reconnect: not connected to GameHub.');
        }
    }

    public async startGame(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('StartGame', gameId);
            } catch (err) {
                console.error('Failed to start game:', err);
            }
        } else {
            console.error('Cannot start game: not connected to GameHub.');
        }
    }

    public async rejoinAsPlayer(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('RejoinAsPlayer', gameId);
            } catch (err) {
                console.error('Failed to rejoin as player:', err);
            }
        } else {
            console.error('Cannot rejoin as player: not connected to GameHub.');
        }
    }

    public async getGameState(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                return await this.connection?.invoke('GetGameState', gameId);
            } catch (err) {
                console.error('Failed to get game state:', err);
                return null;
            }
        } else {
            console.error('Cannot get game state: not connected to GameHub.');
            return null;
        }
    }

    public async respondToPendingAction(gameId: string, response: ActionResponse, blockOption?: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('RespondToPendingAction', gameId, response.toLowerCase(), blockOption);
            } catch (err) {
                console.error('Failed to respond to pending action:', err);
            }
        } else {
            console.error('Cannot respond to pending action: not connected to GameHub.');
        }
    }

    public async respondToReturnCard(gameId: string, cardId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('RespondToReturnCard', gameId, cardId);
            } catch (err) {
                console.error('Failed to respond to return card:', err);
            }
        } else {
            console.error('Cannot respond to return card: not connected to GameHub.');
        }
    }

    public async respondToBlock(gameId: string, isChallenge: boolean) {
        if (await this.ensureConnected()) {
            try {
                console.log('Responding to block:', gameId, isChallenge);
                await this.connection?.invoke('RespondToBlock', gameId, isChallenge);
            } catch (err) {
                console.error('Failed to respond to block:', err);
            }
        } else {
            console.error('Cannot respond to block: not connected to GameHub.');
        }
    }

    public async respondToExchangeSelect(gameId: string, card1: string, card2: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('RespondToExchangeSelect', gameId, card1, card2);
            } catch (err) {
                console.error('Failed to respond to exchange select:', err);
            }
        } else {
            console.error('Cannot respond to exchange select: not connected to GameHub.');
        }
    }

    public async restartGame(game: Game) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('RestartGame', game.id);
            } catch (err) {
                console.error('Failed to restart game:', err);
            }
        } else {
            console.error('Cannot restart game: not connected to GameHub.');
        }
    }

    public async returnToLobby(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('ReturnToLobby', gameId);
            } catch (err) {
                console.error('Failed to return to lobby:', err);
            }
        } else {
            console.error('Cannot return to lobby: not connected to GameHub.');
        }
    }

    public async addBot(gameId: string) {
        if (await this.ensureConnected()) {
            try {
                await this.connection?.invoke('AddBot', gameId);
            } catch (err) {
                console.error('Failed to add bot:', err);
            }
        } else {
            console.error('Cannot add bot: not connected to GameHub.');
        }
    }
}

export default GameHub;
