import PropTypes from 'prop-types';

const Player = ({ player, isCurrentPlayer, isCurrentTurn }) => {
    return (
        <div className={`player card ${isCurrentPlayer ? 'border-primary' : ''} ${!player.isAlive ? 'bg-dark text-white' : 'bg-light'}`}>
            <div className="card-body">
                <h4 className="card-title">
                    {player.username}
                    {isCurrentPlayer && <span className="badge bg-primary ms-2">You</span>}
                    {isCurrentTurn && <span className="badge bg-success ms-2">Current Turn</span>}
                </h4>
                <p className="card-text">Coins: {player.coins}</p>
                <p className="card-text">Influences: {player.characters.length}</p>
                <p className="card-text">Status: {player.isAlive ? 'Alive' : 'Eliminated'}</p>
                <div className="player-characters mt-3">
                    <h5>{isCurrentPlayer ? 'Your Characters:' : 'Opponent Characters:'}</h5>
                    <ul className="list-group">
                        {player.characters.map((character, index) => (
                            <li key={index} className="list-group-item">
                                {character}
                            </li>
                        ))}
                    </ul>
                </div>
                {!player.isAlive && <div className="badge bg-danger mt-2">Eliminated</div>}
            </div>
        </div>
    );
};

Player.propTypes = {
    player: PropTypes.object.isRequired,
    isCurrentPlayer: PropTypes.bool.isRequired,
    isCurrentTurn: PropTypes.bool.isRequired,
};

export default Player;