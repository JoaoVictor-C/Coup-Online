using CoupGameBackend.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CoupGameBackend.Services
{
    public interface IGameService
    {
        Task<Game> CreateGame(string userId, CreateGameRequest request);
        Task<IEnumerable<Game>> GetPublicGamesAsync();
        Task<IEnumerable<Game>> SearchGamesAsync(string query);
        void ScheduleGameDeletion(string gameId);
        void CancelScheduledDeletion(string gameId);
        Task<(bool IsSuccess, string Message)> StartGameAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> RestartGameAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> ResetGameAsync(string gameId, string userId);
        Task<(bool IsSuccess, string Message)> SwitchToSpectatorAsync(string gameId, string userId);
        bool HasPendingAction(string gameId);
        PendingAction? GetPendingAction(string gameId);
        Task<(bool IsSuccess, string Message)> AddBotAsync(string gameId, string userId);

    }
}
