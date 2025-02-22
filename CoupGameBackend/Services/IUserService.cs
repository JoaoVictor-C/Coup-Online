using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IUserService
    {
        Task<string> Authenticate(string username, string password);
        Task<string> Register(string username, string password, string email);
        Task<User> GetCurrentUser(string token);
        Task<bool> VerifyToken(string token, string userId);
    }
}
