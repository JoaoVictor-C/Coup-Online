import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, IconButton, Stack } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';

const Footer: React.FC = () => {
  const { t } = useTranslation(['common']);

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 3,
        mt: 'auto',
        px: 2,
      }}
    >
      <Stack direction="column" alignItems="center" spacing={1}>
        <Stack direction="row" spacing={1}>
          <IconButton
            aria-label="github"
            color="inherit"
            href="https://github.com"
            target="_blank"
            rel="noopener"
          >
            <GitHubIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" align="center">
          {t('common:footer.copyright', {
            year: new Date().getFullYear(),
          })}
        </Typography>
      </Stack>
    </Box>
  );
};

export default Footer;
