import { ParallaxProvider, Parallax } from 'react-scroll-parallax';
import coupLogo from '../assets/images/coup-logo.png';
import assassin from '../assets/images/cards/assassin.png';
import captain from '../assets/images/cards/captain.png';
import contessa from '../assets/images/cards/contessa.png';
import duke from '../assets/images/cards/duke.png';
import ambassador from '../assets/images/cards/ambassador.png';
import '../assets/styles/colors.css'; // Import the color palette
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
const characterCards = [
  { name: 'Assassin', image: assassin, description: 'Spend 3 coins to assassinate another player.', color: "#484848" },
  { name: 'Captain', image: captain, description: 'Steal 2 coins from another player.', color: "#66ac9e" },
  { name: 'Contessa', image: contessa, description: 'Block an assassination.', color: "#d62b54" },
  { name: 'Duke', image: duke, description: 'Take 3 coins from the treasury and block Foreign Aid.', color: "#e5598a" },
  { name: 'Ambassador', image: ambassador, description: 'Exchange your cards with the treasury.', color: "#4d8c69" },
];

// Sub-components for each game rule section
const OverviewSection = () => (
  <section className="mb-4" style={{ color: 'var(--text-color)' }}>
    <h4>Overview</h4>
    <p>
      <strong>COUP Online</strong> is a strategic card game of bluffing, deduction, and manipulation. Each player vies for power by taking actions, challenging opponents, and outmaneuvering rivals to eliminate their influences and emerge victorious.
    </p>
  </section>
);

const GameSetupSection = () => (
  <section className="mb-4" style={{ color: 'var(--text-color)' }}>
    <h4>Game Setup</h4>
    <ul>
      <li><strong>Players:</strong> 2-6</li>
      <li><strong>Starting Resources:</strong>
        <ul>
          <li><strong>Coins:</strong> Each player starts with <strong>2 coins</strong>.</li>
          <li><strong>Characters:</strong> Each player receives <strong>2 random character cards</strong>.</li>
        </ul>
      </li>
    </ul>
  </section>
);

const GameplaySection = () => (
  <section className="mb-4" style={{ color: 'var(--text-color)' }}>
    <h4>Gameplay</h4>
    <h5>On a Player&apos;s Turn, They Must:</h5>
    <ol>
      <li><strong>Choose One Action:</strong> Players must select and perform one of the available actions. Skipping a turn without taking an action is not permitted.</li>
      <li><strong>Action Resolution:</strong> After an action is chosen:
        <ul>
          <li><strong>Other Players:</strong> Have the opportunity to <strong>challenge</strong> or <strong>block</strong> the action when applicable.</li>
          <li><strong>Successful Action:</strong> If no challenges or blocks occur, the action is automatically successful.</li>
          <li><strong>Order of Resolution:</strong> Challenges are resolved before any actions or counteractions.</li>
        </ul>
      </li>
    </ol>

    <h5>Eliminating a Player</h5>
    <p><strong>Loss of Influence:</strong> When a player loses all their influences (i.e., all their character cards), they are immediately <strong>eliminated</strong> from the game. </p>
    <ul>
      <li><strong>Effects of Elimination:</strong>
        <ul>
          <li>The player reveals all their remaining character cards.</li>
          <li>All coins held by the player are returned to the <strong>Central Treasury</strong>.</li>
        </ul>
      </li>
    </ul>

    <h5>Agreements and Secrecy</h5>
    <ul>
      <li><strong>Promises and Agreements:</strong> Players may form any promises or agreements, but there is <strong>no obligation</strong> to honor them.</li>
      <li><strong>Card Secrecy:</strong> Players <strong>cannot reveal</strong> their character cards to others.</li>
      <li><strong>Coin Transactions:</strong> <strong>No coins</strong> may be given or loaned to other players.</li>
    </ul>
  </section>
);

const ActionsSection = () => (
  <section className="mb-4" style={{ color: 'var(--text-color)' }}>
    <h4>Actions</h4>
    <ol>
      <li>
        <strong>Income</strong>
        <ul>
          <li><strong>Effect:</strong> Gain <strong>1 coin</strong> from the central treasury.</li>
          <li><strong>No Counteraction.</strong></li>
        </ul>
      </li>
      <li>
        <strong>Foreign Aid</strong>
        <ul>
          <li><strong>Effect:</strong> Gain <strong>2 coins</strong> from the central treasury.</li>
          <li><strong>Counteraction:</strong> Duke can block this action.</li>
        </ul>
      </li>
      <li>
        <strong>Coup</strong>
        <ul>
          <li><strong>Effect:</strong> Spend <strong>7 coins</strong> to launch a coup against another player. The targeted player immediately loses <strong>1 influence</strong>.</li>
          <li><strong>Mandatory Action:</strong> If a player has <strong>10 or more coins</strong> at the start of their turn, they must perform a coup.</li>
        </ul>
      </li>
      <li>
        <strong>Steal</strong>
        <ul>
          <li><strong>Effect:</strong> Steal <strong>2 coins</strong> from another player.</li>
          <li><strong>Character Requirement:</strong> Requires the <strong>Captain</strong> character.</li>
          <li><strong>Counteraction:</strong> Can be blocked by the Captain or Ambassador.</li>
        </ul>
      </li>
      <li>
        <strong>Exchange</strong>
        <ul>
          <li><strong>Effect:</strong> Exchange <strong>2 character cards</strong> with the central treasury.</li>
          <li><strong>Character Requirement:</strong> Requires the <strong>Ambassador</strong>.</li>
        </ul>
      </li>
      <li>
        <strong>Assassin</strong>
        <ul>
          <li><strong>Effect:</strong> Spend <strong>3 coins</strong> to assassinate another player. The targeted player loses <strong>1 influence</strong>.</li>
          <li><strong>Character Requirement:</strong> Requires the <strong>Assassin</strong>.</li>
          <li><strong>Counteraction:</strong> Can be blocked by the Contessa.</li>
        </ul>
      </li>
      <li>
        <strong>Duke</strong>
        <ul>
          <li><strong>Effect:</strong> Take <strong>3 coins</strong> from the central treasury.</li>
          <li><strong>Character Requirement:</strong> Requires the <strong>Duke</strong>.</li>
        </ul>
      </li>
    </ol>
  </section>
);

const ChallengesSection = () => (
  <section className="mb-4" style={{ color: 'var(--text-color)' }}>
    <h4>Challenges and Blocks</h4>
    <p><strong>Any Action Can Be Challenged:</strong> Any player may challenge the legitimacy of another player&apos;s action.</p>
    <ul>
      <li><strong>Successful Challenge:</strong> If the challenger is correct, the action is <strong>blocked</strong> and <strong>not executed</strong>. The player who attempted the action loses <strong>1 influence</strong>.</li>
      <li><strong>Failed Challenge:</strong> If the challenger is incorrect, they lose <strong>1 influence</strong> instead.</li>
    </ul>
  </section>
);

const WinningSection = () => (
  <section style={{ color: 'var(--text-color)' }}>
    <h4>Winning the Game</h4>
    <p>The last remaining player with at least <strong>1 influence</strong> is declared the <strong>winner</strong>.</p>
  </section>
);

// Main Home Component
const Home = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <ParallaxProvider>
      <div className="container-fluid py-5" style={{ backgroundColor: 'var(--background-color)' }}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="text-center mb-5">
              <img src={coupLogo} alt="COUP Online Logo" className="img-fluid mb-4" style={{ maxWidth: '300px' }} />
              <h1 className="display-4 mb-3" style={{ color: 'var(--primary-color)' }}>Welcome to COUP Online</h1>
              <p className="lead" style={{ color: 'var(--secondary-color)' }}>
                Master the art of deception, read your opponents, and strategize your way to victory!
              </p>
            </div>


            <div className="row justify-content-between align-items-stretch mb-5">
              {characterCards.map((card, index) => (
                <div className="col mb-4" key={index}>
                  <div className="card h-100 shadow" style={{ borderColor: card.color, borderWidth: '2px', backgroundColor: 'var(--accent-color)' }}>
                    <img src={card.image} alt={`${card.name} Card`} className="card-img-top" />
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title" style={{ color: 'var(--primary-color)' }}>{card.name}</h5>
                      <p className="card-text flex-grow-1" style={{ color: 'var(--text-color)' }}>{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <h2 className="h4 mb-4" style={{ color: 'var(--text-color)' }}>Game Rules</h2>
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Overview"
              content={<OverviewSection />}
              imageOnLeft={true}
            />
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Game Setup"
              content={<GameSetupSection />}
              imageOnLeft={false}
            />
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Gameplay"
              content={<GameplaySection />}
              imageOnLeft={true}
            />
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Actions"
              content={<ActionsSection />}
              imageOnLeft={false}
            />
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Challenges"
              content={<ChallengesSection />}
              imageOnLeft={true}
            />
            <ParallaxSection
              imageSrc="/placeholder.jpg"
              title="Winning the Game"
              content={<WinningSection />}
              imageOnLeft={false}
            />

            {isAuthenticated ? (
              <div className="text-center mt-5">
                <h3 className="mb-4">Ready to Play?</h3>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/game/create" className="btn btn-primary btn-lg">
                    Create a New Game
                  </Link>
                  <Link to="/game/join" className="btn btn-secondary btn-lg text-white align-content-center justify-content-center">
                    Join an Existing Game
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center mt-5">
                <h3 className="mb-4">Ready to Play?</h3>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/login" className="btn btn-primary btn-lg">
                    Login to Your Account
                  </Link>
                  <Link to="/register" className="btn btn-secondary btn-lg text-white align-content-center justify-content-center">
                    Register a New Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ParallaxProvider>
  );
};

const ParallaxSection = ({ imageSrc, title, content, imageOnLeft }) => {
  return (
    <div className="row align-items-center mb-5">
      <div className={`col-md-6 ${imageOnLeft ? 'order-md-1' : 'order-md-2'}`}>
        <Parallax translateY={[-20, 20]}>
          <img src={imageSrc} alt={title} className="img-fluid rounded shadow-lg" />
        </Parallax>
      </div>
      <div className={`col-md-6 ${imageOnLeft ? 'order-md-2' : 'order-md-1'}`}>
        <h2 className="mb-4" style={{ color: 'var(--primary-color)' }}>{title}</h2>
        {content}
        <button className="btn btn-primary mt-3">View More</button>
      </div>
    </div>
  );
};

ParallaxSection.propTypes = {
  imageSrc: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  imageOnLeft: PropTypes.bool.isRequired,
};

export default Home;