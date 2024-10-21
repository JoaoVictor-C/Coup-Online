using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IGameStateService
    {
        Task UpdateGameStateAndNotifyPlayers(Game game, string action, string userId, string? targetId = null);
        Task EmitGameUpdatesToUsers(string gameId);
        Task<Game> GetGameState(string gameId, string userId);
        string GetRoleForAction(string actionType);
        void DealCardsToPlayer(Game game, Player player, int numberOfCards);
        Task CheckGameOver(Game game);
        void UpdateTurn(Game game);
    }
}
