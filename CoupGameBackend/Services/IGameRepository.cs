using CoupGameBackend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CoupGameBackend.Services
{
    public interface IGameRepository
    {
        Task<Game> CreateGameAsync(Game game);
        Task<Game?> GetGameByIdOrCodeAsync(string idOrCode);
        Task<string> GetGameIdForUser(string userId);
        Task UpdateGameAsync(Game game);
        Task DeleteGameAsync(string gameId);
        Task<IEnumerable<Game>> GetPublicGamesAsync();
        Task<IEnumerable<Game>> SearchGamesAsync(string query);
        Task RestartGameAsync(string gameId);
        Task<Game?> GetGameAsync(string gameId);
        Task<string> GetGameIdAsync(string gameIdOrCode);
        Task<string> GetUsernameAsync(string userId);
    }
}
