using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IGameRepository
    {
        Task<Game> CreateGameAsync(Game game);
        Task<Game> GetGameByIdAsync(string gameId);
        Task UpdateGameAsync(Game game);
        Task DeleteGameAsync(string gameId);
    }
}
