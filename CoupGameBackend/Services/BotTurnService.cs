using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CoupGameBackend.Models;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CoupGameBackend.Services
{
    public class BotTurnService : IBotTurnService
    {
        // private readonly IActionService _actionService;
        private readonly IGameRepository _gameRepository;
        private readonly IGameStateService _gameStateService;
        private readonly ILogger<BotTurnService> _logger;

        public BotTurnService(
            // IActionService actionService,
            IGameRepository gameRepository,
            IGameStateService gameStateService,
            ILogger<BotTurnService> logger)
        {
            // _actionService = actionService;
            _gameRepository = gameRepository;
            _gameStateService = gameStateService;
            _logger = logger;
        }

        public async Task HandleBotTurnAsync(Game game)
        {
            _logger.LogInformation("Handling bot turn for game ID: {GameId}", game.Id);
            if (game == null)
            {
                _logger.LogError("Game is null in HandleBotTurnAsync.");
                return;
            }

            var botPlayer = game.Players.FirstOrDefault(p => p.UserId == game.CurrentTurnUserId && p.IsBot);
            if (botPlayer == null)
            {
                _logger.LogWarning("No bot player found for game ID: {GameId}", game.Id);
                return;
            }

            var action = ChooseBotAction(botPlayer, game);
            if (action == null)
            {
                _logger.LogWarning("Bot {BotUserId} has no valid actions to perform.", botPlayer.UserId);
                return;
            }

            _logger.LogInformation("Bot {BotUserId} is performing action: {ActionType}", botPlayer.UserId, action.Type);

            try
            {
                // var result = await _actionService.PerformAction(
                //     gameId: game.Id,
                //     userId: botPlayer.UserId,
                //     action: action.Type,
                //     targetId: action.TargetUserId);

                // if (result is OkResult)
                // {
                //     _logger.LogInformation("Bot {BotUserId} successfully performed action: {ActionType}", botPlayer.UserId, action.Type);
                // }
                // else
                // {
                //     _logger.LogWarning("Bot {BotUserId} failed to perform action: {ActionType}. Reason: {Reason}",
                //         botPlayer.UserId, action.Type, (result as ObjectResult)?.Value);
                // }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while bot {BotUserId} performing action: {ActionType}", botPlayer.UserId, action.Type);
            }
        }

        public async Task HandlePendingActionResponseAsync(Game game, PendingAction pendingAction)
        {
            if (game == null || pendingAction == null)
            {
                _logger.LogError("Game or PendingAction is null in HandlePendingActionResponseAsync.");
                return;
            }

            var botPlayers = game.Players.Where(p => p.IsBot && p.IsActive).ToList();
            if (!botPlayers.Any())
            {
                _logger.LogInformation("No active bot players found to respond to the pending action.");
                return;
            }

            foreach (var bot in botPlayers)
            {
                // If initiator of the pending action is the bot, the bot should not respond
                if (pendingAction.InitiatorId == bot.UserId || pendingAction.Responses.ContainsKey(bot.UserId))
                {
                    continue;
                }

                // Decide bot response based on the pending action type
                var response = DecideBotResponse(bot, game, pendingAction);
                if (response == null)
                {
                    _logger.LogInformation("Bot {BotUserId} chose not to respond to the pending action.", bot.UserId);
                    continue;
                }

                _logger.LogInformation("Bot {BotUserId} is responding to pending action: {ActionType} with {ResponseType}",
                    bot.UserId, pendingAction.ActionType, response.ResponseType);

                try
                {
                    // var processResult = await _actionService.ProcessPendingActionResponse(
                    //     game.Id,
                    //     bot.UserId,
                    //     response.ResponseType.ToString().ToLower(),
                    //     response.BlockOption);

                    // if (processResult.IsSuccess)
                    // {
                    //     _logger.LogInformation("Bot {BotUserId} successfully responded with {ResponseType}. Message: {Message}",
                    //         bot.UserId, response.ResponseType, processResult.Message);

                    //     // If the response affects the pending action (e.g., block or challenge), stop further responses
                    //     if (response.ResponseType == BotResponseType.Block || response.ResponseType == BotResponseType.Challenge)
                    //     {
                    //         break;
                    //     }
                    // }
                    // else
                    // {
                    //     _logger.LogWarning("Bot {BotUserId} failed to respond. Message: {Message}",
                    //         bot.UserId, processResult.Message);
                    // }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while bot {BotUserId} responding to action: {ActionType}", bot.UserId, pendingAction.ActionType);
                }
            }

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.EmitGameUpdatesToUsers(game.Id);
        }

        private BotResponse? DecideBotResponse(Player bot, Game game, PendingAction pendingAction)
        {
            var random = new Random();
            switch (pendingAction.ActionType.ToLower())
            {
                case "steal":
                case "assassinate":
                case "tax":
                case "foreign_aid":
                    int decision = random.Next(100);
                    if (decision < 50)
                    {
                        // Decide to block
                        string? blockOption = DecideBlockOption(pendingAction.ActionType, bot, game);
                        if (blockOption != null)
                        {
                            return new BotResponse
                            {
                                ResponseType = BotResponseType.Block,
                                BlockOption = blockOption
                            };
                        }
                    }
                    else if (decision < 80)
                    {
                        // Decide to challenge
                        return new BotResponse
                        {
                            ResponseType = BotResponseType.Challenge
                        };
                    }
                    else
                    {
                        // Decide to pass
                        return new BotResponse
                        {
                            ResponseType = BotResponseType.Pass
                        };
                    }
                    return null; // Add return statement to handle case when blockOption is null
                default:
                    return null;
            }
        }

        private string? DecideBlockOption(string actionType, Player bot, Game game)
        {
            // Simplistic approach: choose a role that can block the action
            // For example, for foreign_aid, Duke can block; for steal, Captain or Ambassador can block
            // This requires knowledge of the game roles, which are not defined here.
            // Assuming roles are stored in player's Hand, which contains card names.

            switch (actionType.ToLower())
            {
                case "foreign_aid":
                    if (bot.Hand.Any(c => c.Name.Equals("Duke", StringComparison.OrdinalIgnoreCase) && !c.IsRevealed))
                        return "Duke";
                    break;
                case "steal":
                    if (bot.Hand.Any(c => c.Name.Equals("Captain", StringComparison.OrdinalIgnoreCase) && !c.IsRevealed))
                        return "Captain";
                    if (bot.Hand.Any(c => c.Name.Equals("Ambassador", StringComparison.OrdinalIgnoreCase) && !c.IsRevealed))
                        return "Ambassador";
                    break;
                case "assassinate":
                    if (bot.Hand.Any(c => c.Name.Equals("Contessa", StringComparison.OrdinalIgnoreCase) && !c.IsRevealed))
                        return "Contessa";
                    break;
                case "tax":
                    if (bot.Hand.Any(c => c.Name.Equals("Duke", StringComparison.OrdinalIgnoreCase) && !c.IsRevealed))
                        return "Duke";
                    break;
                default:
                    break;
            }

            return null;
        }

        private class BotResponse
        {
            public BotResponseType ResponseType { get; set; }
            public string? BlockOption { get; set; }
        }

        private enum BotResponseType
        {
            Block,
            Challenge,
            Pass
        }

        private BotAction ChooseBotAction(Player bot, Game game)
        {
            // Simple strategy: prioritize actions based on available coins
            if (bot.Coins >= 7)
            {
                // Prefer Coup if affordable
                var target = SelectRandomTarget(game, excludeUserId: bot.UserId);
                if (target != null)
                {
                    return new BotAction("coup", target.UserId);
                }
            }

            if (bot.Coins >= 3)
            {
                // Optionally, use Assassinate
                var target = SelectRandomTarget(game, excludeUserId: bot.UserId);
                if (target != null)
                {
                    return new BotAction("assassinate", target.UserId);
                }
            }

            // Otherwise, choose between Income or Foreign Aid
            var possibleActions = new[] { "income", "foreign_aid" };
            var random = new Random();
            var chosenAction = possibleActions[random.Next(possibleActions.Length)];

            return new BotAction(chosenAction, null);
        }

        private Player? SelectRandomTarget(Game game, string excludeUserId)
        {
            var potentialTargets = game.Players.Where(p => p.IsActive && p.UserId != excludeUserId).ToList();
            if (!potentialTargets.Any())
                return null;

            var random = new Random();
            int index = random.Next(potentialTargets.Count);
            return potentialTargets[index];
        }

        private class BotAction
        {
            public string Type { get; }
            public string? TargetUserId { get; }

            public BotAction(string type, string? targetUserId)
            {
                Type = type;
                TargetUserId = targetUserId;
            }
        }
    }
}
