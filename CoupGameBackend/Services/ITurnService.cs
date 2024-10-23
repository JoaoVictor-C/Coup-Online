using System.Threading.Tasks;
using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface ITurnService
    {
        Task UpdateTurnAsync(Game game);
    }
}