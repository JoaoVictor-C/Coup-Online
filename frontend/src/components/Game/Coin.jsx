import PropTypes from 'prop-types';
import coinImage1 from '../../assets/images/common/coup-coin-1.png'; // 1 coin value
import coinImage5 from '../../assets/images/common/coup-coin-5.png'; // 5 coin value

const Coin = ({ count }) => {
  const coinImage = count >= 5 ? coinImage5 : coinImage1;

  return (
    <div className="d-flex align-items-center">
      <img src={coinImage} alt="Coin" className="me-2" style={{ width: '30px', height: '30px' }} />
      <span className="text-light">{count}</span>
    </div>
  );
};

Coin.propTypes = {
  count: PropTypes.number.isRequired,
};

export default Coin;