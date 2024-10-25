using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CoupGameBackend.Models;
using CoupGameBackend.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace CoupGameBackend.Services
{
    public class SchedulingService : ISchedulingService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IHubContext<GameHub> _hubContext;
        private readonly ConcurrentDictionary<string, CancellationTokenSource> PendingDeletions = new ConcurrentDictionary<string, CancellationTokenSource>();
        private readonly CancellationTokenSource _automaticCleanupTokenSource = new CancellationTokenSource();

        public SchedulingService(IGameRepository gameRepository, IHubContext<GameHub> hubContext)
        {
            _gameRepository = gameRepository;
            _hubContext = hubContext;
            // Start the automatic game cleanup schedule
            _ = RunAutomaticCleanupAsync(_automaticCleanupTokenSource.Token);
        }

        public void ScheduleGameDeletion(string gameId)
        {
            if (PendingDeletions.ContainsKey(gameId))
                return;

            var cts = new CancellationTokenSource();
            if (PendingDeletions.TryAdd(gameId, cts))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromMinutes(3), cts.Token);
                        var game = await _gameRepository.GetGameAsync(gameId);
                        if (game != null && game.Players.All(p => !p.IsActive))
                        {
                            Console.WriteLine($"Game: {game.GameName} is being deleted");
                            await _gameRepository.DeleteGameAsync(gameId);
                            await _hubContext.Clients.All.SendAsync("GameDeleted", gameId);
                        }
                        PendingDeletions.TryRemove(gameId, out _);
                    }
                    catch (TaskCanceledException)
                    {
                        PendingDeletions.TryRemove(gameId, out _);
                    }
                });
            }
        }

        public void CancelScheduledDeletion(string gameId)
        {
            if (PendingDeletions.TryRemove(gameId, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }
        }

        private async Task RunAutomaticCleanupAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(10), cancellationToken);

                    var games = await _gameRepository.GetAllGamesAsync();
                    foreach (var game in games)
                    {
                        bool hasPlayers = game.Players.Any();
                        bool hasConnectedPlayers = game.Players.Any(p => p.IsConnected);

                        if (!hasPlayers || !hasConnectedPlayers)
                        {
                            Console.WriteLine($"Game: {game.GameName} has no connected players or no players. Deleting.");
                            await _gameRepository.DeleteGameAsync(game.Id);
                            await _hubContext.Clients.All.SendAsync("GameDeleted", game.Id);
                        }
                    }
                }
                catch (TaskCanceledException)
                {
                    // Gracefully handle cancellation
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in automatic game cleanup: {ex.Message}");
                    // Optionally, implement logging or retry mechanisms here
                }
            }
        }

        // Optional: Call this method to gracefully stop the automatic cleanup when the service is disposed
        public void StopAutomaticCleanup()
        {
            _automaticCleanupTokenSource.Cancel();
        }
    }
}