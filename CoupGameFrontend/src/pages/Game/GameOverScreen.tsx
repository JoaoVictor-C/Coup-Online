import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { Button, Container, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useState } from 'react';

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

    // New state for return confirmation
    const [showReturnConfirmation, setShowReturnConfirmation] = useState(false);

    const handleReturnToGame = () => {
      setShowReturnConfirmation(true);
    };

    const confirmReturnToGame = () => {
      setShowReturnConfirmation(false);
      onExit(); // Assuming exiting the game returns to the main screen
    };

    const cancelReturnToGame = () => {
      setShowReturnConfirmation(false);
    };

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
                    {/* Return to Game Button */}
                    <Button variant="outlined" color="secondary" onClick={handleReturnToGame}>
                        {t('common:buttons.returnToGame')}
                    </Button>
                </Stack>
            ) : (
                <>
                    <Typography variant="body1" mt={2}>
                        {t('game:gameOver.waiting')}
                    </Typography>
                    {/* Return to Game Button for non-leaders */}
                    <Button variant="outlined" color="secondary" onClick={handleReturnToGame} sx={{ mt: 3 }}>
                        {t('common:buttons.returnToGame')}
                    </Button>
                </>
            )}

            {/* Confirmation Dialog */}
            <Dialog
              open={showReturnConfirmation}
              onClose={cancelReturnToGame}
            >
              <DialogTitle>{t('common:confirm.returnToGameTitle')}</DialogTitle>
              <DialogContent>
                <Typography variant="body1">
                  {t('common:confirm.returnToGameMessage')}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={cancelReturnToGame} color="primary">
                  {t('common:buttons.cancel')}
                </Button>
                <Button onClick={confirmReturnToGame} color="secondary">
                  {t('common:buttons.confirm')}
                </Button>
              </DialogActions>
            </Dialog>
        </Container>
    );
};

export default GameOverScreen;
