using CoupGameBackend.Models;

namespace CoupGameBackend.Services
{
    public interface IUserRepository
    {
        Task<User> GetByUsernameAsync(string username);
        Task<User> GetByIdAsync(string id);
        Task CreateAsync(User user);
    }
}
