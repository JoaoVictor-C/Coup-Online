import PropTypes from 'prop-types';
import backCard from '../../assets/images/cards/back-card.png';
import ambassador from '../../assets/images/cards/ambassador.png';
import assassin from '../../assets/images/cards/assassin.png';
import captain from '../../assets/images/cards/captain.png';
import contessa from '../../assets/images/cards/contessa.png';
import duke from '../../assets/images/cards/duke.png';

const cardImages = {
  ambassador,
  assassin,
  captain,
  contessa,
  duke,
  backCard,
};

// Action mapping based on card type
const cardActions = {
  duke: 'taxes',
  assassin: 'assassinate',
  ambassador: 'exchange',
  captain: 'steal',
  // contessa does not have an action
};

const Card = ({
  character,
  isRevealed,
  isSelectable,
  onClick,
  className,
  enabled,
  style,
}) => {
  const cardImage = isRevealed
    ? cardImages[character.toLowerCase()] || backCard
    : backCard;

  // Handle click event
  const handleClick = () => {
    if (isSelectable && onClick && enabled) {
      onClick(cardActions[character.toLowerCase()]);
    }
  };

  return (
    <div
      className={`card ${isSelectable ? 'selectable-action' : ''} ${className} justify-content-center align-items-center`}
      onClick={isSelectable ? handleClick : undefined}
      style={{ cursor: isSelectable && enabled ? 'pointer' : 'default', ...style }}
    >
      <img
        src={cardImage}
        alt={character}
        className="card-img-top border border-dark"
        style={{ width: '100px', height: 'auto', maxHeight: '171px' }}
      />
    </div>
  );
};

Card.propTypes = {
  character: PropTypes.string.isRequired,
  isRevealed: PropTypes.bool,
  isSelectable: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  enabled: PropTypes.bool,
  style: PropTypes.object,
};

export default Card;