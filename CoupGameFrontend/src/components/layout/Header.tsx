// Start of Selection
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import useAuth from '@hooks/useAuth';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation(['common']);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ flexGrow: 1, mb: 4 }}>
      <AppBar position="static" elevation={4}>
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
          >
            Coup Online
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            {user ? (
              <>
                <Button color="inherit" component={RouterLink} to="/rooms">
                  {t('common:navigation.rooms')}
                </Button>
                <Typography variant="body1" sx={{ mx: 2 }}>
                  {t('common:greeting', { username: user.username })}
                </Typography>
                <Button color="inherit" onClick={logout}>
                  {t('common:buttons.logout')}
                </Button>
                <Avatar sx={{ ml: 2 }}>{user.username.charAt(0).toUpperCase()}</Avatar>
              </>
            ) : (
              <>
                <Button color="inherit" component={RouterLink} to="/login">
                  {t('common:buttons.login')}
                </Button>
                <Button color="inherit" component={RouterLink} to="/register">
                  {t('common:buttons.register')}
                </Button>
              </>
            )}
          </Box>
          {/* Mobile Menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMenu}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              {user
                ? [
                  <MenuItem
                    key="rooms"
                    component={RouterLink}
                    to="/rooms"
                    onClick={handleClose}
                  >
                    {t('common:navigation.rooms')}
                  </MenuItem>,
                  <MenuItem
                    key="logout"
                    onClick={() => {
                      logout();
                      handleClose();
                    }}
                  >
                    {t('common:buttons.logout')}
                  </MenuItem>,
                ]
                : [
                  <MenuItem
                    key="login"
                    component={RouterLink}
                    to="/login"
                    onClick={handleClose}
                  >
                    {t('common:buttons.login')}
                  </MenuItem>,
                  <MenuItem
                    key="register"
                    component={RouterLink}
                    to="/register"
                    onClick={handleClose}
                  >
                    {t('common:buttons.register')}
                  </MenuItem>,
                ]}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
