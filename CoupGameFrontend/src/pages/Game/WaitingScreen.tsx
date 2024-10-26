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

  // Define animation variants for the loader
  const loaderVariants = {
    animate: { y: [0, -20, 0] },
    transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
  };

  // Define animation variants for buttons
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
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
          variants={loaderVariants}
          animate="animate"
        >
          <CircularProgress size={60} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <Typography variant="h5" sx={{ mt: 3 }}>
            {t('game:waitingForPlayers')}
          </Typography>
        </motion.div>
        {/* Return to Game Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button variant="outlined" color="secondary" onClick={handleReturnToGame} sx={{ mt: 4 }}>
              {t('common:buttons.returnToGame')}
            </Button>
          </motion.div>
        </motion.div>

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
