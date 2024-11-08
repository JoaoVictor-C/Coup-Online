using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IBotTurnService
    {
        Task HandleBotTurnAsync(Game game);
        Task HandlePendingActionResponseAsync(Game game, PendingAction pendingAction);
    }
}