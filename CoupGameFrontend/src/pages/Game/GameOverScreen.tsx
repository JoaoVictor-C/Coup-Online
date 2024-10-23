
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';

interface GameOverScreenProps {
    winnerName: string | null;
    onRestart: () => void;
    onExit: () => void;
    game: Game;
    currentUserId: string;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winnerName, onRestart, onExit, game, currentUserId }) => {
    const { t } = useTranslation(['game', 'common']);
    return (
        <div className="game-over-screen text-center">
            <h2>Game Over</h2>
            <p>Winner: {winnerName}</p>
            {game.players.find(player => player.userId === currentUserId)?.userId === game.leaderId ? (
                <>
                    <button className="btn btn-primary m-2" onClick={onRestart}>{t('common:buttons.restart')}</button>
                    <button className="btn btn-secondary m-2" onClick={onExit}>{t('common:buttons.exit')}</button>
                </>
            ) : (
                <p>
                    {t('game:gameOver.waiting')}
                </p>
            )}
        </div>
    );
};

export default GameOverScreen;
