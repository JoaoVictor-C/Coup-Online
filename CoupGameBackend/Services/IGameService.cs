using CoupGameBackend.Models;
using Microsoft.AspNetCore.Mvc;

namespace CoupGameBackend.Services
{
    public interface IGameService
    {
        Task<Game> CreateGame(string userId, CreateGameRequest request);
        Task<Game> JoinGame(string userId, string gameId);
        Task<Game> GetGameState(string gameId, string userId);
        Task<bool> HandleDisconnection(string gameId, string userId);
        Task AddUserConnection(string userId, string connectionId);
        Task RemoveUserConnection(string userId, string connectionId);

        // Game Actions
        Task<IActionResult> PerformAction(string gameId, string userId, string action, object parameters);
        // Define other methods as needed
    }
}
