using CoupGameBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;

namespace CoupGameBackend.Services
{
    public class GameRepository : IGameRepository
    {
        private readonly IMongoCollection<Game> _games;

        public GameRepository(IConfiguration configuration)
        {
            var client = new MongoClient(configuration.GetConnectionString("MongoDB"));
            var database = client.GetDatabase("CoupGameDB");
            _games = database.GetCollection<Game>("Games");
        }

        public async Task<Game> CreateGameAsync(Game game)
        {
            await _games.InsertOneAsync(game);
            return game;
        }

        public async Task<Game> GetGameByIdAsync(string gameId)
        {
            return await _games.Find(g => g.Id == gameId).FirstOrDefaultAsync();
        }

        public async Task UpdateGameAsync(Game game)
        {
            await _games.ReplaceOneAsync(g => g.Id == game.Id, game);
        }

        public async Task DeleteGameAsync(string gameId)
        {
            await _games.DeleteOneAsync(g => g.Id == gameId);
        }
    }
}
