using System.Linq;
using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public class TurnService : ITurnService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IBotTurnService _botTurnService;

        public TurnService(IGameRepository gameRepository, IBotTurnService botTurnService)
        {
            _gameRepository = gameRepository;
            _botTurnService = botTurnService;
        }

        public async Task UpdateTurn(Game game)
        {
            while (true)
            {
                var activePlayers = game.Players.Where(p => p.IsActive).ToList();
                if (!activePlayers.Any())
                    return;

                var currentIndex = activePlayers.FindIndex(p => p.UserId == game.CurrentTurnUserId);
                var nextIndex = (currentIndex + 1) % activePlayers.Count;
                game.CurrentTurnUserId = activePlayers[nextIndex].UserId;

                await _gameRepository.UpdateGameAsync(game);

                // var currentPlayer = game.Players.FirstOrDefault(p => p.UserId == game.CurrentTurnUserId);
                // if (currentPlayer?.IsBot == true)
                // {
                //     await _botTurnService.HandleBotTurnAsync(game);
                //     UpdateTurn(game);
                // }
            }
        }
    }
}