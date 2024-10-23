import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { Button, Container, Typography, Stack } from '@mui/material';

interface GameOverScreenProps {
    winnerName: string | null;
    onRestart: () => void;
    onExit: () => void;
    game: Game;
    currentUserId: string;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winnerName, onRestart, onExit, game, currentUserId }) => {
    const { t } = useTranslation(['game', 'common']);
    const isLeader = game.players.find(player => player.userId === currentUserId)?.userId === game.leaderId;

    return (
        <Container sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h4" gutterBottom>
                {t('game:gameOver.title')}
            </Typography>
            <Typography variant="h5" gutterBottom>
                {t('game:gameOver.winner')}: {winnerName || t('game:player.unknown')}
            </Typography>
            {isLeader ? (
                <Stack direction="row" justifyContent="center" spacing={2} mt={4}>
                    <Button variant="contained" color="primary" onClick={onRestart}>
                        {t('common:buttons.restart')}
                    </Button>
                    <Button variant="outlined" color="secondary" onClick={onExit}>
                        {t('common:buttons.exit')}
                    </Button>
                </Stack>
            ) : (
                <Typography variant="body1" mt={2}>
                    {t('game:gameOver.waiting')}
                </Typography>
            )}
        </Container>
    );
};

export default GameOverScreen;
