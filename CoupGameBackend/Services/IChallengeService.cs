using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IChallengeService
    {
        Task<(bool IsSuccess, string Message, bool? HasRole)> HandleChallengeAsync(Game game, string challengerId);
        Task<(bool IsSuccess, string Message)> HandleBlockAsync(Game game, string blockerId, string? blockOption);
    }
}
