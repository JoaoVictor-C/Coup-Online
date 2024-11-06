import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button, Grid, Card, CardContent, CardMedia } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useAuth from '@hooks/useAuth';
import { cardImages } from '@utils/types'; // Import card images

interface RuleSection {
  title: string;
  content: string;
}

const Home: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'game']);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/rooms');
    } else {
      navigate('/login');
    }
  };

  const rules: Record<string, RuleSection> = t('game:home.rules.sections', { returnObjects: true }) as Record<string, RuleSection>;

  // Define card details
  const cards = [
    {
      name: t('game:cards.ambassador'),
      image: cardImages.ambassador,
      description: t('game:actions.exchange.description'),
    },
    {
      name: t('game:cards.assassin'),
      image: cardImages.assassin,
      description: t('game:actions.assassinate.description'),
    },
    {
      name: t('game:cards.captain'),
      image: cardImages.captain,
      description: t('game:actions.steal.description'),
    },
    {
      name: t('game:cards.contessa'),
      image: cardImages.contessa,
      description: t('game:actions.contessa.description'),
    },
    {
      name: t('game:cards.duke'),
      image: cardImages.duke,
      description: t('game:actions.tax.description'),
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: 'url(/assets/images/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#000',
          paddingY: 10,
          textAlign: 'center',
          borderRadius: 2,
          boxShadow: 3,
          marginTop: 4,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          {t('game:home.heroTitle')}
        </Typography>
        <Typography variant="h5" component="p" gutterBottom>
          {t('game:home.heroSubtitle')}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleGetStarted}
          sx={{ mt: 4 }}
        >
          {isLoggedIn ? t('common:buttons.join') : t('common:buttons.login')}
        </Button>
      </Box>

      {/* Rules and How to Play Section */}
      <Box sx={{ marginY: 8 }}>
        <Typography variant="h4" align="center" gutterBottom>
          {t('game:home.rules.title')}
        </Typography>
        <Typography variant="subtitle1" align="center" gutterBottom>
          {t('game:home.rules.description')}
        </Typography>
        <Grid container spacing={4} justifyContent="center" sx={{ marginTop: 4 }}>
          {Object.keys(rules).map((key) => (
            key !== 'title' && key !== 'description' && (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card sx={{ maxWidth: 345, margin: '0 auto' }}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {rules[key].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <div dangerouslySetInnerHTML={{ __html: rules[key].content }} />
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          ))}
        </Grid>

        {/* Cards Section */}
        <Box sx={{ marginY: 8 }}>
          <Typography variant="h4" align="center" gutterBottom>
            {t('game:home.rules.cards.title', { defaultValue: 'Cards Overview' })}
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('game:home.rules.cards.description', { defaultValue: 'Learn about each character card and their abilities.' })}
          </Typography>
          <Grid container spacing={4} justifyContent="center" sx={{ marginTop: 4 }}>
            {cards.map((card) => (
              <Grid item xs={12} sm={6} md={4} key={card.name}>
                <Card sx={{ maxWidth: 345, margin: '0 auto' }}>
                  <CardMedia
                    component="img"
                    height="210"
                    image={card.image}
                    alt={card.name}
                    sx={{ objectFit: 'contain', padding: 2 }}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align="center">
                      {card.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {card.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* Call to Action Section */}
      <Box
        sx={{
          backgroundColor: '#f0f4f8',
          paddingY: 6,
          textAlign: 'center',
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" gutterBottom>
          {t('game:home.callToAction.title')}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t('game:home.callToAction.description')}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          size="large"
          onClick={() => navigate('/rooms')}
          sx={{ mt: 2 }}
        >
          {t('common:buttons.rooms')}
        </Button>
      </Box>
    </Container>
  );
};

export default Home;
