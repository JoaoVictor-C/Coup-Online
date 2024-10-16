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
        Task<IActionResult> PerformAction(string gameId, string userId, string action, ActionParameters parameters);
        // Define other methods as needed
    }

    // Define a base class for action parameters
    public abstract class ActionParameters
    {
        public string TargetUserId { get; set; } = string.Empty;
    }

    // Define specific parameter classes for different actions
    public class CoupActionParameters : ActionParameters { }
    public class StealActionParameters : ActionParameters { }
    public class AssassinateActionParameters : ActionParameters { }
    // Add more as needed
}
