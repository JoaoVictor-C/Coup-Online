using CoupGameBackend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CoupGameBackend.Services
{
    public interface IGameRepository
    {
        Task<Game> CreateGameAsync(Game game);
        Task<Game> GetGameByIdAsync(string gameId);
        Task<Game> GetGameByRoomCodeAsync(string roomCode);
        Task<Game?> GetGameByIdOrCodeAsync(string idOrCode);
        Task<string> GetGameIdForUser(string userId);
        Task UpdateGameAsync(Game game);
        Task DeleteGameAsync(string gameId);
        
        // New Methods
        Task<IEnumerable<Game>> GetPublicGamesAsync();
        Task<IEnumerable<Game>> SearchGamesAsync(string query);
    }
}
