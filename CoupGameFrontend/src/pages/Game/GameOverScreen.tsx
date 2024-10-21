
import { Game } from '@utils/types';

interface GameOverScreenProps {
    winnerName: string | null;
    onRestart: () => void;
    onExit: () => void;
    game: Game;
    currentUserId: string;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winnerName, onRestart, onExit, game, currentUserId }) => {
    return (
        <div className="game-over-screen text-center">
            <h2>Game Over</h2>
            <p>Winner: {winnerName}</p>
            {game.players.find(player => player.userId === currentUserId)?.userId === game.leaderId ? (
                <>
                    <button className="btn btn-primary m-2" onClick={onRestart}>Restart Game</button>
                    <button className="btn btn-secondary m-2" onClick={onExit}>Exit to Lobby</button>
                </>
            ) : (
                <p>
                    Waiting for the leader to restart the game...
                </p>
            )}
        </div>
    );
};

export default GameOverScreen;
