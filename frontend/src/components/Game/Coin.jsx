import PropTypes from 'prop-types';
import coinImage1 from '../../assets/images/common/coup-coin-1.png'; // 1 coin value
import coinImage5 from '../../assets/images/common/coup-coin-5.png'; // 5 coin value

const Coin = ({ count }) => {
  const coinImage = count >= 5 ? coinImage5 : coinImage1;

  return (
    <div className="coin-container">
      <img src={coinImage} alt="Coin" className="coin-image" />
      <span className="coin-count text-black">{count}</span>
    </div>
  );
};

Coin.propTypes = {
  count: PropTypes.number.isRequired,
};

export default Coin;