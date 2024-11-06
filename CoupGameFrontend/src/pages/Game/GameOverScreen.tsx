import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { Button, Container, Typography, Stack } from '@mui/material';
import { motion } from 'framer-motion';

interface GameOverScreenProps {
    winnerName: string | null;
    onRestart: () => void;
    onExit: () => void;
    game: Game;
    currentUserId: string;
    showGame: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winnerName, onRestart, onExit, game, currentUserId, showGame }) => {
    const { t } = useTranslation(['game', 'common']);
    const isLeader = game.players.find(player => player.userId === currentUserId)?.userId === game.leaderId;

    return (
        <Container sx={{ textAlign: 'center', py: 5 }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Typography variant="h4" gutterBottom>
                    {t('game:gameOver.title')}
                </Typography>
            </motion.div>
            <motion.div
                initial={{ color: '#000' }}
                animate={{ color: '#FFD700' }}
                transition={{ duration: 1, repeat: Infinity, repeatType: 'mirror' }}
            >
                <Typography variant="h5" gutterBottom>
                    {t('game:gameOver.winner')}: {winnerName || t('game:player.unknown')}
                </Typography>
            </motion.div>
            {isLeader ? (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <Stack direction="row" justifyContent="center" spacing={2} mt={4}>
                        <Button variant="contained" color="primary" onClick={onRestart}>
                            {t('common:buttons.restart')}
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={onExit}>
                            {t('common:buttons.exit')}
                        </Button>
                        {/* Return to Game Button */}
                        <Button variant="outlined" color="secondary" onClick={showGame}>
                            {t('common:buttons.returnToGame')}
                        </Button>
                    </Stack>
                </motion.div>
            ) : (
                <>
                    <Typography variant="body1" mt={2}>
                        {t('game:gameOver.waiting')}
                    </Typography>
                    {/* Return to Game Button for non-leaders */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <Button variant="outlined" color="secondary" onClick={showGame} sx={{ mt: 3 }}>
                            {t('common:buttons.returnToGame')}
                        </Button>
                    </motion.div>
                </>
            )}
        </Container>
    );
};

export default GameOverScreen;
