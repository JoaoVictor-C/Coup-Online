 using System.Linq;
using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public class TurnService : ITurnService
    {
        private readonly IGameRepository _gameRepository;

        public TurnService(IGameRepository gameRepository)
        {
            _gameRepository = gameRepository;
        }

        public async Task UpdateTurnAsync(Game game)
        {
            var activePlayers = game.Players.Where(p => p.IsActive).ToList();
            if (!activePlayers.Any())
                return;

            var currentIndex = activePlayers.FindIndex(p => p.UserId == game.CurrentTurnUserId);
            var nextIndex = (currentIndex + 1) % activePlayers.Count;
            game.CurrentTurnUserId = activePlayers[nextIndex].UserId;

            await _gameRepository.UpdateGameAsync(game);
        }
    }
}