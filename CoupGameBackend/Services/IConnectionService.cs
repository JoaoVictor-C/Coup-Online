using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
public interface IConnectionService
{
    Task AddUserConnection(string userId, string connectionId);
    Task RemoveUserConnection(string userId, string connectionId);
    Task<Game> JoinGame(string userId, string gameIdOrCode);
    Task<(bool IsSuccess, string Message, string GameId)> JoinGameInProgress(string userId, string gameIdOrCode);
    Task<(bool IsSuccess, string Message)> ReconnectToGame(string gameId, string userId, string? newConnectionId);
    Task<(bool IsSuccess, string Message)> HandleDisconnection(string gameId, string userId);
    Task<(bool IsSuccess, string Message)> LeaveGameAsync(string gameId, string userId);
    Task<(bool IsSuccess, string Message)> RejoinAsPlayerAsync(string gameId, string userId);
}
}
