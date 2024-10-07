import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import '../../assets/styles/WarningComponent.css';

const WarningComponent = () => {
  const lastAction = useSelector((state) => state.game.lastAction);
  const currentUserId = useSelector((state) => state.auth.userId);
  const players = useSelector((state) => state.game.currentGame?.players || []);
  const [actionHistory, setActionHistory] = useState([]);
  const [centerMessage, setCenterMessage] = useState('');

  useEffect(() => {
    const getUsernameById = (userId) => {
      const player = players.find(p => p.playerProfile.user._id === userId);
      return player ? player.playerProfile.user.username : 'Unknown';
    };

    if (lastAction && lastAction.userId !== currentUserId) {
      const actorUsername = lastAction.username || getUsernameById(lastAction.userId);
      const action = lastAction.action;
      let message = `Player ${actorUsername} performed ${action}`;
      if (lastAction.targetUserId) {
        const targetUsername = getUsernameById(lastAction.targetUserId);
        message += ` on Player ${targetUsername}`;
      }

      // Update action history
      setActionHistory(prevHistory => {
        const newHistory = [message, ...prevHistory];
        return newHistory.slice(0, 5); // Keep only the last 5 messages
      });

      // Update center message
      setCenterMessage(message);

      const timer = setTimeout(() => {
        setCenterMessage('');
      }, 3000); // Display the message for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [lastAction, currentUserId, players]);

  return (
    <>
      {actionHistory.length > 0 && (
        <div className="warning-component">
          <ul>
            {actionHistory.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {centerMessage && (
        <div className="center-message">
          {centerMessage}
        </div>
      )}
    </>
  );
};

export default WarningComponent;