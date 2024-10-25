import React, { useState } from 'react';
import { Container, CircularProgress, Typography, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const WaitingScreen: React.FC = () => {
  const { t } = useTranslation(['game', 'common']);
  
  // New state for return confirmation
  const [showReturnConfirmation, setShowReturnConfirmation] = useState(false);

  const handleReturnToGame = () => {
    setShowReturnConfirmation(true);
  };

  const confirmReturnToGame = () => {
    setShowReturnConfirmation(false);
    // Implement navigation back to main game screen if needed
    window.history.back(); // Example action
  };

  const cancelReturnToGame = () => {
    setShowReturnConfirmation(false);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <CircularProgress size={60} />
        </motion.div>
        <Typography variant="h5" sx={{ mt: 3 }}>
          {t('game:waitingForPlayers')}
        </Typography>
        {/* Return to Game Button */}
        <Button variant="outlined" color="secondary" onClick={handleReturnToGame} sx={{ mt: 4 }}>
          {t('common:buttons.returnToGame')}
        </Button>

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
      </Box>
    </Container>
  );
};

export default WaitingScreen;
