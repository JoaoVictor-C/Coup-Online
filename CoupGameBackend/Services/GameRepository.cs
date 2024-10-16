using CoupGameBackend.Models;
using MongoDB.Driver;

namespace CoupGameBackend.Services
{
    public class GameRepository : IGameRepository
    {
        private readonly IMongoCollection<Game> _games;

        public GameRepository(IMongoDatabase database)
        {
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
            var result = await _games.ReplaceOneAsync(g => g.Id == game.Id, game);
            if (result.ModifiedCount == 0)
            {
                throw new InvalidOperationException("Failed to update the game.");
            }
        }

        public async Task DeleteGameAsync(string gameId)
        {
            var result = await _games.DeleteOneAsync(g => g.Id == gameId);
            if (result.DeletedCount == 0)
            {
                throw new InvalidOperationException("Failed to delete the game.");
            }
        }
    }
}
