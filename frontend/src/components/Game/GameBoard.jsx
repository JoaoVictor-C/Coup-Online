import React from 'react';
import { useDispatch } from 'react-redux';
import { makePlayerAction } from '../../store/actions/gameActions';

const GameBoard = ({ game }) => {
  const dispatch = useDispatch();

  const handleAction = (actionType, details) => {
    // Emit the action via socket or dispatch a Redux action
    dispatch(makePlayerAction(game.id, actionType, details));
  };

  return (
    <div>
      <h3>Players</h3>
      <ul>
        {game.players.map((player) => (
          <li key={player.user.id}>
            {player.user.username} - Coins: {player.user.coins}
          </li>
        ))}
      </ul>
      {/* Add more game details */}
      <button onClick={() => handleAction('income', {})}>Take Income</button>
      {/* Add more action buttons */}
    </div>
  );
};

export default GameBoard;