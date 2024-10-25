using System.Threading.Tasks;
using CoupGameBackend.Models;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using CoupGameBackend.Hubs;
using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading;

namespace CoupGameBackend.Services
{
    public class ConnectionService : IConnectionService
    {
        private readonly IGameRepository _gameRepository;
        private readonly ISchedulingService _schedulingService;
        private readonly IHubContext<GameHub> _hubContext;
        private readonly IGameStateService _gameStateService;
        private static readonly ConcurrentDictionary<string, string> UserConnections = new ConcurrentDictionary<string, string>();
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> PendingDisconnections = new ConcurrentDictionary<string, CancellationTokenSource>();

        public ConnectionService(IGameRepository gameRepository, ISchedulingService schedulingService, IHubContext<GameHub> hubContext, IGameService gameService, IGameStateService gameStateService)
        {
            _gameRepository = gameRepository;
            _schedulingService = schedulingService;
            _hubContext = hubContext;
            _gameStateService = gameStateService;
        }

        public Task AddUserConnection(string userId, string connectionId)
        {
            UserConnections.AddOrUpdate(userId, connectionId, (key, oldValue) => connectionId);
            return Task.CompletedTask;
        }

        public Task RemoveUserConnection(string userId, string connectionId)
        {
            UserConnections.TryRemove(userId, out _);
            return Task.CompletedTask;
        }

        public async Task<Game> JoinGame(string userId, string gameIdOrCode)
        {
            var game = await _gameRepository.GetGameByIdOrCodeAsync(gameIdOrCode);
            if (game == null)
                throw new KeyNotFoundException("Game not found.");

            var existingSpectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (existingSpectator != null)
            {
                return game;
            }

            // Cancel any pending deletion if a player is joining
            _schedulingService.CancelScheduledDeletion(game.Id);

            // Check if the user is already a player
            var existingPlayer = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (existingPlayer != null)
            {
                // User is already a player; handle accordingly
                return game;
            }

            if (game.Players.Count >= game.PlayerCount || game.IsStarted)
            {
                // Game is full; add as spectator
                game.Spectators.Add(new Spectator { UserId = userId });
                await _gameRepository.UpdateGameAsync(game);
                await _hubContext.Clients.Group(game.Id).SendAsync("SpectatorJoined", userId);
                return game;
            }
            else
            {
                // Add as a new player
                var newPlayer = new Player
                {
                    Username = await _gameRepository.GetUsernameAsync(userId),
                    UserId = userId,
                    Coins = 2,
                    Influences = 2,
                    IsActive = true,
                    IsConnected = true
                };
                game.Players.Add(newPlayer);

                await _gameRepository.UpdateGameAsync(game);
                await _hubContext.Clients.Group(game.Id).SendAsync("PlayerJoined", userId);
                return game;
            }
        }

        public async Task<(bool IsSuccess, string Message)> ReconnectToGame(string gameId, string userId, string? newConnectionId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            // Check if user is a player
            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player != null)
            {
                Console.WriteLine($"Player {player.Username} reconnected.");
                var timeoutKey = $"{game.Id}_{userId}";
                if (PendingDisconnections.TryRemove(timeoutKey, out var cts))
                {
                    // Cancel the pending disconnection timeout
                    cts.Cancel();
                    cts.Dispose();

                    // Restore player connection status
                    player.IsConnected = true;

                    // Update the connection ID if provided
                    if (!string.IsNullOrEmpty(newConnectionId))
                    {
                        await AddUserConnection(userId, newConnectionId);
                    }

                    // Notify others about the reconnection
                    await _hubContext.Clients.Group(gameId).SendAsync("PlayerReconnected", userId);

                    // Update the game state in the repository
                    await _gameRepository.UpdateGameAsync(game);

                    return (true, "Reconnected successfully as player.");
                }

                return (false, "No pending player reconnection found or reconnection window has expired.");
            }

            // Check if user is a spectator
            var spectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (spectator != null)
            {
                // Update the connection ID if provided
                if (!string.IsNullOrEmpty(newConnectionId))
                {
                    await AddUserConnection(userId, newConnectionId);
                }

                // Restore spectator connection status
                spectator.IsConnected = true;

                // Notify others about spectator reconnection
                await _hubContext.Clients.Group(gameId).SendAsync("SpectatorReconnected", userId);

                return (true, "Reconnected successfully as spectator.");
            }

            return (false, "User not found in game as player or spectator.");
        }

        public async Task<(bool IsSuccess, string Message)> HandleDisconnection(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player != null)
            {
                Console.WriteLine($"Player {player.Username} disconnected.");
                // Mark player as disconnected
                player.IsConnected = false;
                await _gameRepository.UpdateGameAsync(game);

                // Notify other players
                await _hubContext.Clients.Group(gameId).SendAsync("PlayerDisconnected", userId);

                var timeoutKey = $"{gameId}_{userId}";
                var cts = new CancellationTokenSource();
                if (PendingDisconnections.TryGetValue(timeoutKey, out var existingCts))
                {
                    existingCts.Cancel();
                    existingCts.Dispose();
                    PendingDisconnections.TryRemove(timeoutKey, out _);
                }

                if (PendingDisconnections.TryAdd(timeoutKey, cts))
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await Task.Delay(TimeSpan.FromSeconds(45), cts.Token);
                            // After timeout, kick the player if still disconnected
                            var updatedGame = await _gameRepository.GetGameAsync(gameId);
                            var disconnectedPlayer = updatedGame.Players.FirstOrDefault(p => p.UserId == userId);
                            if (disconnectedPlayer != null && !disconnectedPlayer.IsConnected)
                            {
                                // Remove player from the game
                                updatedGame.Players.Remove(disconnectedPlayer);
                                await _gameRepository.UpdateGameAsync(updatedGame);

                                // Notify other players about the player being kicked
                                await _hubContext.Clients.Group(gameId).SendAsync("PlayerKicked", userId);

                                // If the player was the leader, assign a new leader
                                if (updatedGame.LeaderId == userId)
                                {
                                    if (updatedGame.Players.Count > 0)
                                    {
                                        updatedGame.LeaderId = updatedGame.Players.First().UserId;
                                        await _hubContext.Clients.Group(gameId).SendAsync("LeaderChanged", updatedGame.LeaderId);
                                    }
                                    else
                                    {
                                        // No players left, schedule game deletion
                                        await _gameRepository.UpdateGameAsync(updatedGame);
                                        _schedulingService.ScheduleGameDeletion(gameId);
                                        return;
                                    }
                                }
                                // Check if the game is over
                                _gameStateService.CheckGameOver(updatedGame);
                                await _gameRepository.UpdateGameAsync(updatedGame);
                            }

                            // Remove the timeout
                            PendingDisconnections.TryRemove(timeoutKey, out _);
                            cts.Dispose();
                        }
                        catch (TaskCanceledException)
                        {
                            // Reconnection occurred, do nothing
                            PendingDisconnections.TryRemove(timeoutKey, out _);
                            cts.Dispose();
                        }
                        catch (Exception ex)
                        {
                            // Log the exception
                            Console.WriteLine($"Error handling disconnection timeout: {ex.Message}");
                            PendingDisconnections.TryRemove(timeoutKey, out _);
                            cts.Dispose();
                        }
                    });
                }

                return (true, "Player marked as disconnected. You have 45 seconds to reconnect.");
            }

            // Handle spectator disconnection
            var spectatorDisconnected = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (spectatorDisconnected != null)
            {
                // Mark spectator as disconnected
                spectatorDisconnected.IsConnected = false;
                await _gameRepository.UpdateGameAsync(game);

                // Notify others about spectator disconnection
                await _hubContext.Clients.Group(gameId).SendAsync("SpectatorDisconnected", userId);

                // Optionally, handle spectator disconnection timeout similarly

                return (true, "Spectator marked as disconnected.");
            }

            // If user is neither a player nor a spectator
            return (false, "User not found in the game.");
        }

        public async Task<(bool IsSuccess, string Message, string GameId)> JoinGameInProgress(string userId, string gameIdOrCode)
        {
            var game = await _gameRepository.GetGameByIdOrCodeAsync(gameIdOrCode);

            if (game == null)
            {
                return (false, "Game not found.", string.Empty);
            }

            if (game.IsGameOver)
            {
                return (false, "Game is already over.", string.Empty);
            }

            var existingSpectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (existingSpectator != null)
            {
                return (false, "You are already a spectator in this game.", game.Id);
            }

            game.Spectators.Add(new Spectator { UserId = userId, IsConnected = true });
            await _gameRepository.UpdateGameAsync(game);
            await _hubContext.Clients.Group(game.Id).SendAsync("SpectatorJoined", userId);

            return (true, "Joined as a spectator. Waiting for the game to finish.", game.Id);
        }

        public async Task<(bool IsSuccess, string Message)> LeaveGameAsync(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            var spectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);

            if (player == null && spectator == null)
            {
                return (false, "User not found in the game.");
            }

            if (player != null)
            {
                // Remove player from the game
                game.Players.Remove(player);

                // Notify other players about the player leaving
                await _hubContext.Clients.Group(gameId).SendAsync("PlayerLeft", userId);

                // If the player was the leader, assign a new leader
                if (game.LeaderId == userId)
                {
                    if (game.Players.Count > 0)
                    {
                        game.LeaderId = game.Players.First().UserId;
                        await _hubContext.Clients.Group(gameId).SendAsync("LeaderChanged", game.LeaderId);
                    }
                    else
                    {
                        // No players left, schedule game deletion
                        _schedulingService.ScheduleGameDeletion(gameId);
                    }
                }
            }
            else if (spectator != null)
            {
                // Remove spectator from the game
                game.Spectators.Remove(spectator);

                // Mark spectator as disconnected
                await RemoveUserConnection(userId, UserConnections.ContainsKey(userId) ? UserConnections[userId] : string.Empty);

                // Notify others about spectator departure
                await _hubContext.Clients.Group(gameId).SendAsync("SpectatorLeft", userId);
            }

            // Update the game state in the repository
            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.EmitGameUpdatesToUsers(gameId);
            return (true, "Successfully left the game.");
        }

        public async Task<(bool IsSuccess, string Message)> RejoinAsPlayerAsync(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameByIdOrCodeAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.IsStarted && !game.IsGameOver)
                return (false, "Cannot rejoin as a player while the game is in progress.");

            var spectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);

            if (game.Players.Any(p => p.UserId == userId))
                return (false, "User is already a player in the game.");

            // Remove from spectators
            if (spectator != null)
            {
                game.Spectators.Remove(spectator);
            }

            // Remove the spectator's connection
            await RemoveUserConnection(userId, UserConnections.ContainsKey(userId) ? UserConnections[userId] : string.Empty);

            // Add back to active players
            var player = new Player
            {
                UserId = userId,
                Username = await _gameRepository.GetUsernameAsync(userId),
                Coins = game.IsStarted ? 0 : 2, // Start with 0 coins if game is in progress
                Influences = game.IsStarted ? 0 : 2, // Start with 0 influences if game is in progress
                IsActive = true,
                IsConnected = true,
                Hand = new List<Card>()
            };
            game.Players.Add(player);

            // If the game is in progress, deal cards to the player
            if (game.IsStarted)
            {
                _gameStateService.DealCardsToPlayer(game, player, 2);
            }

            // Log the action
            game.ActionsHistory.Add(new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = userId,
                Action = "Rejoined as Player"
            });

            // Update the game state
            await _gameRepository.UpdateGameAsync(game);

            // Notify clients
            await _gameStateService.EmitGameUpdatesToUsers(gameId);

            return (true, "Successfully rejoined the game as a player.");
        }
    }
}
