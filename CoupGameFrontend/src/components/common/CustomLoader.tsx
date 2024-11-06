import React from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';

interface CustomLoaderProps {
  message: string;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({ message }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 5 }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CircularProgress size={60} />
      </motion.div>
      <Typography variant="h6" sx={{ mt: 3 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default CustomLoader;