import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Button, Typography, Accordion, AccordionSummary, AccordionDetails, Box, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import logo from '@assets/images/coup-logo.png';
import useAuth from '@hooks/useAuth';

const Home: React.FC = () => {
  const { isLoggedIn } = useAuth();

  return (
    <Container sx={{ my: 5 }}>
      <Stack alignItems="center" mb={4}>
        <Box component="img" src={logo} alt="Coup Logo" sx={{ width: 150, height: 150 }} />
      </Stack>
      <Stack alignItems="center" mb={5}>
        <Typography variant="h3" gutterBottom>
          Welcome to Coup Online
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Experience the thrill of deception and strategy in the world of Coup.
        </Typography>
      </Stack>
      {isLoggedIn ? (
        <Stack direction="row" justifyContent="center" mb={5} spacing={2}>
          <Button component={RouterLink} to="/rooms" variant="contained" color="primary" size="large">
            Rooms
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" justifyContent="center" mb={5} spacing={2}>
          <Button component={RouterLink} to="/login" variant="contained" color="primary" size="large">
            Login
          </Button>
          <Button component={RouterLink} to="/register" variant="outlined" color="secondary" size="large">
            Register
          </Button>
        </Stack>
      )}
      <Box>
        <Typography variant="h4" align="center" gutterBottom>
          How to Play
        </Typography>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Objective</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              The objective of Coup is to be the last player with influence in the game. Influence is represented by face-down character cards.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Gameplay</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Players take turns performing actions to collect coins, perform coups, or use special abilities based on their characters. Bluffing is a key element, as players can lie about their characters to gain advantages.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Characters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Each character has unique abilities:
            </Typography>
            <ul>
              <li><Typography><strong>Duke:</strong> Tax and block foreign aid.</Typography></li>
              <li><Typography><strong>Assassin:</strong> Pay coins to assassinate another player's character.</Typography></li>
              <li><Typography><strong>Captain:</strong> Steal coins from another player and block stealing.</Typography></li>
              <li><Typography><strong>Ambassador:</strong> Exchange cards from the deck and block stealing.</Typography></li>
              <li><Typography><strong>Contessa:</strong> Block an assassination attempt.</Typography></li>
            </ul>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Winning the Game</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              The game continues until only one player remains with influence. Strategic use of actions, bluffing, and countering opponents' moves are crucial to securing victory.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
};

export default Home;
