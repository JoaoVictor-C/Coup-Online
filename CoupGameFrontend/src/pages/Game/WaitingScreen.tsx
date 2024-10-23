import React from 'react';
import { Container, CircularProgress, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const WaitingScreen: React.FC = () => {
  const { t } = useTranslation(['game', 'common']);
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
      </Box>
    </Container>
  );
};

export default WaitingScreen;
