using CoupGameBackend.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CoupGameBackend.Services
{
    public interface IGameService
    {
        Task<Game> CreateGame(string userId, CreateGameRequest request);
        Task<Game> JoinGame(string userId, string gameIdOrCode);
        Task<Game> GetGameState(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> HandleDisconnection(string gameId, string userId);
        Task AddUserConnection(string userId, string connectionId);
        Task RemoveUserConnection(string userId, string connectionId);
        Task<IActionResult> PerformAction(string gameId, string userId, string action, ActionParameters parameters);
        Task<(bool IsSuccess, string Message)> ChallengeAction(string gameId, string challengerId, string challengedUserId);
        Task<(bool IsSuccess, string Message)> BlockAction(string gameId, string blockerId, string blockedUserId, string action);
        Task<(bool IsSuccess, string Message, string GameId)> JoinGameInProgress(string userId, string gameIdOrCode);
        Task<(bool IsSuccess, string Message)> ReconnectToGame(string gameIdOrCode, string userId, string? newConnectionId);
        Task<IEnumerable<Game>> GetPublicGamesAsync();
        Task<IEnumerable<Game>> SearchGamesAsync(string query);
        void ScheduleGameDeletion(string gameId);
        void CancelScheduledDeletion(string gameId);
        Task<(bool IsSuccess, string Message)> StartGameAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> RestartGameAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> SwitchToSpectatorAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> RejoinAsPlayerAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> LeaveGameAsync(string gameId, string userId);
        Task<string> GetGameIdAsync(string gameIdOrCode);
        Task<Game?> GetGameAsync(string gameIdOrCode);
        Task EmitGameUpdatesToUsers(string gameId);
    }
}
