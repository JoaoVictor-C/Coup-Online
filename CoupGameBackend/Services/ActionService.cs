using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using CoupGameBackend.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using CoupGameBackend.Hubs;

namespace CoupGameBackend.Services
{
    public class ActionService : IActionService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IGameStateService _gameStateService;
        private readonly IChallengeService _challengeService;
        private readonly IHubContext<GameHub> _hubContext;
        public ActionService(IGameRepository gameRepository, IGameStateService gameStateService, IChallengeService challengeService, IHubContext<GameHub> hubContext)
        {
            _gameRepository = gameRepository;
            _gameStateService = gameStateService;
            _challengeService = challengeService;
            _hubContext = hubContext;
        }

        public async Task<IActionResult> HandleIncomeAction(Game game, Player player)
        {
            player.Coins += 1;

            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = player.UserId,
                Action = "Income"
            };
            game.ActionsHistory.Add(actionLog);
            _gameStateService.UpdateTurn(game);
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Income", player.UserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleForeignAidAction(Game game, Player player)
        {
            var pendingForeignAid = new PendingAction
            {
                ActionType = "foreign_aid",
                InitiatorId = player.UserId,
                OriginalActionType = "foreign_aid",
                IsActionResolved = false
            };

            game.PendingAction = pendingForeignAid;

            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "ForeignAid", player.UserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleCoupAction(Game game, Player player, CoupActionParameters parameters)
        {
            if (player.Coins < 7)
                return new BadRequestObjectResult(new { message = "Not enough coins to perform Coup." });

            if (parameters is not CoupActionParameters coupParams)
                return new BadRequestObjectResult(new { message = "Invalid action parameters for Coup." });

            if (string.IsNullOrEmpty(coupParams.TargetUserId))
                return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

            var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == coupParams.TargetUserId);
            if (targetPlayer == null)
                return new NotFoundObjectResult(new { message = "Target player not found." });

            player.Coins -= 7;

            // Select 1 random alive card from the target's hand, set the IsRevealed to True
            var aliveCards = targetPlayer.Hand.Where(c => !c.IsRevealed).ToList();
            if (aliveCards.Any())
            {
                var randomCard = aliveCards[new Random().Next(aliveCards.Count)];
                randomCard.IsRevealed = true;
                targetPlayer.Influences -= 1;
            }
            else
            {
                // Handle the case where there are no alive cards
                Console.WriteLine($"No alive cards found for player {targetPlayer.UserId}");
            }

            if (targetPlayer.Influences <= 0)
            {
                targetPlayer.IsActive = false;
            }

            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = player.UserId,
                Action = $"Coup on {coupParams.TargetUserId}",
                TargetId = targetPlayer.UserId
            };
            game.ActionsHistory.Add(actionLog);


            _gameStateService.UpdateTurn(game);

            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Coup", player.UserId, coupParams.TargetUserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleStealAction(Game game, Player player, StealActionParameters parameters)
        {
            // Implement Steal action handling similar to HandleCoupAction
            if (parameters is not StealActionParameters stealParams)
                return new BadRequestObjectResult(new { message = "Invalid action parameters for Steal." });

            if (string.IsNullOrEmpty(stealParams.TargetUserId))
                return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

            var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == stealParams.TargetUserId);
            if (targetPlayer == null)
                return new NotFoundObjectResult(new { message = "Target player not found." });

            var pendingSteal = new PendingAction
            {
                ActionType = "steal",
                OriginalActionType = "steal",
                InitiatorId = player.UserId,
                TargetId = parameters.TargetUserId,
                IsActionResolved = false
            };

            game.PendingAction = pendingSteal;

            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Steal", player.UserId, parameters.TargetUserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleAssassinateAction(Game game, Player player, AssassinateActionParameters parameters)
        {
            if (player.Coins < 3)
                return new BadRequestObjectResult(new { message = "Not enough coins to perform Assassinate." });

            if (string.IsNullOrEmpty(parameters.TargetUserId))
                return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

            var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == parameters.TargetUserId);
            if (targetPlayer == null || !targetPlayer.IsActive)
                return new NotFoundObjectResult(new { message = "Target player not found." });

            var pendingAssassinate = new PendingAction
            {
                ActionType = "assassinate",
                OriginalActionType = "assassinate",
                InitiatorId = player.UserId,
                TargetId = parameters.TargetUserId,
                Parameters = parameters,
                IsActionResolved = false
            };

            game.PendingAction = pendingAssassinate;

            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Assassinate", player.UserId, parameters.TargetUserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleExchangeAction(Game game, Player player)
        {
            // Implement Exchange action handling
            if (game.CentralDeck.Count < 2)
                return new BadRequestObjectResult(new { message = "Not enough cards in the central deck for Exchange." });


            var pendingExchange = new PendingAction
            {
                ActionType = "exchange",
                OriginalActionType = "exchange",
                InitiatorId = player.UserId,
                IsActionResolved = false
            };

            game.PendingAction = pendingExchange;
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Exchange", player.UserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleTaxAction(Game game, Player player)
        {
            var pendingTax = new PendingAction
            {
                ActionType = "tax",
                OriginalActionType = "tax",
                InitiatorId = player.UserId,
                IsActionResolved = false
            };

            game.PendingAction = pendingTax;
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Tax", player.UserId);
            return new OkResult();
        }

        private async Task<IActionResult> ExecuteStealAsync(Game game, PendingAction pendingAction, bool updateTurn = true)
        {
            if (pendingAction == null)
            {
                Console.WriteLine("Pending action is null.");
                return new BadRequestObjectResult(new { message = "Pending action is null." });
            }

            var initiator = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
            var target = game.Players.FirstOrDefault(p => p.UserId == pendingAction.TargetId);

            if (initiator == null || target == null || !target.IsActive)
            {
                Console.WriteLine("Initiator or target player not found.");
                return new NotFoundObjectResult(new { message = "Initiator or target player not found." });
            }

            if (target.Coins <= 0)
                return new BadRequestObjectResult(new { message = "Target player has no coins to steal." });

            int stolenCoins = Math.Min(2, target.Coins);
            target.Coins -= stolenCoins;
            initiator.Coins += stolenCoins;

            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = initiator.UserId,
                Action = $"Steal {stolenCoins} coins from {target.UserId}",
                TargetId = target.UserId
            };
            game.ActionsHistory.Add(actionLog);

            if (updateTurn)
                _gameStateService.UpdateTurn(game);

            await _gameRepository.UpdateGameAsync(game);

            try
            {
                await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Steal", initiator.UserId, target.UserId);
                return new OkResult();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return new StatusCodeResult(500);
            }
        }

        private async Task<IActionResult> ExecuteAssassinateAsync(Game game, PendingAction pendingAction, bool updateTurn = true)
        {
            if (pendingAction == null)
                return new BadRequestObjectResult(new { message = "Pending action is null." });

            var initiator = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
            var target = game.Players.FirstOrDefault(p => p.UserId == pendingAction.TargetId);

            if (initiator == null || target == null || !target.IsActive)
                return new NotFoundObjectResult(new { message = "Initiator or target player not found." });

            if (initiator.Coins < 3)
                return new BadRequestObjectResult(new { message = "Not enough coins to perform Assassinate." });

            initiator.Coins -= 3;
            target.Influences -= 1;

            var cardToReveal = target.Hand.Where(c => !c.IsRevealed).OrderBy(c => Guid.NewGuid()).FirstOrDefault();
            if (cardToReveal != null)
            {
                cardToReveal.IsRevealed = true;
            }

            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = initiator.UserId,
                Action = $"Assassinate attempted on {target.UserId}",
                TargetId = target.UserId
            };
            game.ActionsHistory.Add(actionLog);

            if (updateTurn)
                _gameStateService.UpdateTurn(game);
            
            await _gameRepository.UpdateGameAsync(game);

            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Assassinate", initiator.UserId, target.UserId);

            return new OkResult();
        }

        private async Task<IActionResult> ExecuteExchangeAsync(Game game, PendingAction pendingAction)
        {
            if (pendingAction == null)
                return new BadRequestObjectResult(new { message = "Pending action is null." });

            var player = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);

            if (player == null)
                return new NotFoundObjectResult(new { message = "Player not found." });

            if (game.CentralDeck.Count < 2)
                return new BadRequestObjectResult(new { message = "Not enough cards in the central deck for Exchange." });

            // Draw two cards from central deck
            var drawnCards = game.CentralDeck.Take(2).ToList();
            game.CentralDeck.RemoveRange(0, 2);
            player.Hand.AddRange(drawnCards);

            game.PendingAction = new PendingAction
            {
                ActionType = "exchangeSelect",
                OriginalActionType = "exchange",
                InitiatorId = player.UserId,
                IsActionResolved = false,
                Timestamp = DateTime.UtcNow,
                Responses = new Dictionary<string, string>()
            };

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Exchange", player.UserId);

            return new OkResult();
        }

        private async Task<IActionResult> ExecuteTaxAsync(Game game, PendingAction pendingAction, bool updateTurn = true)
        {
            var player = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
            if (player == null)
                return new NotFoundObjectResult(new { message = "Player not found." });

            player.Coins += 3;

            if (updateTurn)
                _gameStateService.UpdateTurn(game);

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "Tax", player.UserId);
            return new OkResult();
        }

        private async Task<IActionResult> ExecuteForeignAidAsync(Game game, PendingAction pendingAction, bool updateTurn = true)
        {
            var player = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
            if (player == null)
                return new NotFoundObjectResult(new { message = "Player not found." });

            player.Coins += 2;

            if (updateTurn)
                _gameStateService.UpdateTurn(game);

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.UpdateGameStateAndNotifyPlayers(game, "ForeignAid", player.UserId);
            return new OkResult();
        }

        public async Task<IActionResult> HandleActionAsync(Game game, PendingAction pendingAction, bool updateTurn = true)
        {
            if (pendingAction == null)
                return new BadRequestObjectResult(new { message = "Pending action is null." });

            switch (pendingAction.ActionType.ToLower())
            {
                case "steal":
                    return await ExecuteStealAsync(game, pendingAction, updateTurn);
                case "assassinate":
                    return await ExecuteAssassinateAsync(game, pendingAction, updateTurn);
                case "exchange":
                    return await ExecuteExchangeAsync(game, pendingAction);
                case "tax":
                    return await ExecuteTaxAsync(game, pendingAction, updateTurn);
                case "foreign_aid":
                    return await ExecuteForeignAidAsync(game, pendingAction, updateTurn);
                default:
                    return new BadRequestObjectResult(new { message = "Invalid action type." });
            }
        }

        public async Task<IActionResult> PerformAction(string gameId, string userId, string action, string? targetId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            var player = game?.Players.Find(p => p.UserId == userId);
            if (game == null || player == null)
                return new NotFoundResult();

            if (player.Coins >= 10 && action.ToLower() != "coup")
                return new BadRequestObjectResult(new { message = "You need to perform a coup when you have 10 or more coins." });

            IActionResult result = action.ToLower() switch
            {
                "income" => await HandleIncomeAction(game, player),
                "foreign_aid" => await HandleForeignAidAction(game, player),
                "coup" => await HandleCoupAction(game, player, new CoupActionParameters { TargetUserId = targetId ?? string.Empty }),
                "steal" => await HandleStealAction(game, player, new StealActionParameters { TargetUserId = targetId ?? string.Empty }),
                "assassinate" => await HandleAssassinateAction(game, player, new AssassinateActionParameters { TargetUserId = targetId ?? string.Empty }),
                "exchange" => await HandleExchangeAction(game, player),
                "tax" => await HandleTaxAction(game, player),
                _ => new BadRequestObjectResult(new { message = "Invalid action type." })
            };

            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return result;
        }

        public async Task<(bool IsSuccess, string Message)> HandleExchangeSelectResponseAsync(Game game, string userId, string card1, string card2)
        {
            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null)
                return (false, "Player not found.");

            var cardSelected1 = player.Hand.FirstOrDefault(c => c.Name == card1 && !c.IsRevealed);
            if (cardSelected1 == null)
                return (false, "Card 1 not found.");
            player.Hand.Remove(cardSelected1);
            var cardSelected2 = player.Hand.FirstOrDefault(c => c.Name == card2 && !c.IsRevealed);
            if (cardSelected2 == null)
                return (false, "Card 2 not found.");
            player.Hand.Remove(cardSelected2);

            game.CentralDeck.Add(cardSelected1);
            game.CentralDeck.Add(cardSelected2);

            game.PendingAction = null;

            _gameStateService.UpdateTurn(game);

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return (true, "Exchange completed successfully.");
        }

        public async Task<IActionResult> CancelPendingAction(Game game, PendingAction pendingAction)
        {
            game.PendingAction = null;

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return new OkResult();
        }

        /// <summary>
        /// Processes the user's response to a pending action.
        /// </summary>
        public async Task<(bool IsSuccess, string Message)> ProcessPendingActionResponse(string gameId, string userId, string response, string? blockOption)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.PendingAction == null || game.PendingAction.IsActionResolved)
                return (false, "No pending action to respond to.");

            // Ensure it's the user's turn to respond
            if (game.PendingAction.InitiatorId == userId)
                return (false, "You are not authorized to respond to this action.");

            // If the player already responded, we don't need to process the response
            if (game.PendingAction.Responses.ContainsKey(userId))
                return (false, "You already responded to this action.");

            // If the pending action is a return card, we don't need to process the response
            if (game.PendingAction.ActionType == "returnCard")
                return (true, "Action is pending return card response.");

            switch (response)
            {
                case "pass":
                    return await HandlePassResponse(game, userId);
                case "block":
                    return await HandleBlockResponse(game, userId, blockOption);
                case "challenge":
                    return await HandleChallengeResponse(game, userId);
                default:
                    return (false, "Invalid response.");
            }
        }

        private async Task<(bool IsSuccess, string Message)> HandlePassResponse(Game game, string userId)
        {
            // Logic for passing the action
            if (!game.PendingAction.Responses.ContainsKey(userId))
            {
                game.PendingAction.Responses.Add(userId, "pass");
            } else {
                return (false, "You already passed.");
            }
            // Log the pass action
            game.ActionsHistory.Add(new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = userId,
                Action = "Pass"
            });

            int activePlayerCount = game.Players.Count(p => p.Influences > 0 && p.IsActive && p.UserId != game.PendingAction.InitiatorId);
            Console.WriteLine($"Active player count: {activePlayerCount}, Responses count: {game.PendingAction.Responses.Count}");
            if (game.PendingAction.Responses.Count == activePlayerCount)
            {
                await HandleActionAsync(game, game.PendingAction);
                game.PendingAction.IsActionResolved = true;
                if (game.PendingAction.ActionType != "exchangeSelect")
                {
                    game.PendingAction = null;
                }
            }

            await _gameRepository.UpdateGameAsync(game);
            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return (true, "Action passed.");
        }

        private async Task<(bool IsSuccess, string Message)> HandleBlockResponse(Game game, string userId, string? blockOption)
        {
            // Logic for blocking the action
            var challengeResult = await _challengeService.HandleBlockAsync(game, userId, blockOption);

            if (challengeResult.IsSuccess)
            {
                game.PendingAction.IsActionResolved = true;
                game.PendingAction.Responses.Add(userId, "block");

                // Log the block action
                game.ActionsHistory.Add(new ActionLog
                {
                    Timestamp = DateTime.UtcNow,
                    PlayerId = userId,
                    Action = $"Blocked {game.PendingAction.ActionType}"
                });

                await _gameRepository.UpdateGameAsync(game);
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);

                return (true, "Action blocked successfully.");
            }
            else
            {
                return (false, challengeResult.Message);
            }
        }

        private async Task<(bool IsSuccess, string Message)> HandleChallengeResponse(Game game, string userId)
        {
            // Logic for challenging the action
            var challengeResult = await _challengeService.HandleChallengeAsync(game, userId);
            if (challengeResult.IsSuccess && game.PendingAction != null)
            {
                game.PendingAction.IsActionResolved = true;
                game.PendingAction.Responses.Add(userId, "challenge");

                // Log the challenge action
                game.ActionsHistory.Add(new ActionLog
                {
                    Timestamp = DateTime.UtcNow,
                    PlayerId = userId,
                    Action = $"Challenged {game.PendingAction.ActionType}"
                });

                if (challengeResult.HasRole == true)
                {
                    await ExecuteDrawCardAsync(game, game.PendingAction);
                }
                else
                {
                    game.PendingAction = null;
                    _gameStateService.UpdateTurn(game);
                }

                await _gameRepository.UpdateGameAsync(game);
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);

                return (true, "Challenge resolved.");
            }
            else
            {
                return (false, challengeResult.Message);
            }
        }

        public async Task<IActionResult> ExecuteDrawCardAsync(Game game, PendingAction pendingAction)
        {
            var player = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
            if (player == null)
                return new NotFoundObjectResult(new { message = "Player not found." });

            // Draw a random card from the central deck
            var drawnCard = game.CentralDeck.OrderBy(c => Guid.NewGuid()).FirstOrDefault();
            if (drawnCard == null)
                return new BadRequestObjectResult(new { message = "No cards left in the central deck." });

            player.Hand.Add(drawnCard);

            // Log the action
            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = player.UserId,
                Action = "Draw Card",
                TargetId = null
            };
            game.ActionsHistory.Add(actionLog);

            // Create a pending action for selecting a card to return
            var returnCardAction = new PendingAction
            {
                ActionType = "ReturnCard",
                OriginalActionType = pendingAction.ActionType,
                TargetId = pendingAction.TargetId,
                Parameters = pendingAction.Parameters,
                InitiatorId = player.UserId,
                IsActionResolved = false,
                Responses = new Dictionary<string, string>()
            };
            game.PendingAction = returnCardAction;

            await _gameRepository.UpdateGameAsync(game);

            // Notify the player to select a card to return
            await _hubContext.Clients.User(player.UserId).SendAsync("PromptReturnCard", new
            {
                PlayerHand = player.Hand.Select(c => c.Name).ToList()
            });

            return new OkResult();
        }

        public async Task<IActionResult> HandleReturnCardResponseAsync(Game game, string playerId, string cardId)
        {
            var player = game.Players.FirstOrDefault(p => p.UserId == playerId);
            if (player == null)
                return new NotFoundObjectResult(new { message = "Player not found." });

            var pendingAction = game.PendingAction;
            if (pendingAction == null || pendingAction.ActionType != "ReturnCard" || pendingAction.InitiatorId != playerId)
            {
                Console.WriteLine($"No pending return card action. Pending action: {pendingAction?.ActionType}, InitiatorId: {pendingAction?.InitiatorId}, PlayerId: {playerId}");
                return new BadRequestObjectResult(new { message = "No pending return card action." });
            }


            var cardToReturn = player.Hand.FirstOrDefault(c => c.Name == cardId);
            if (cardToReturn == null)
                return new BadRequestObjectResult(new { message = "Card not found in player's hand." });

            // If the card selected is revealed, give an error
            if (cardToReturn.IsRevealed)
                return new BadRequestObjectResult(new { message = "Card is revealed. Cannot return revealed card." });

            // Remove the card from player's hand and add it back to the deck
            player.Hand.Remove(cardToReturn);
            game.CentralDeck.Add(cardToReturn);

            // Log the action
            var actionLog = new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = player.UserId,
                Action = $"Returned hidden card to the deck",
                TargetId = null
            };
            game.ActionsHistory.Add(actionLog);

            // Return the action to its original state
            game.PendingAction.ActionType = game.PendingAction.OriginalActionType;

            // Execute the action
            await HandleActionAsync(game, game.PendingAction, false);

            // Resolve the pending action
            Console.WriteLine(game.PendingAction.ActionType);
            if (game.PendingAction.ActionType != "exchangeSelect")
            {
                game.PendingAction = null;
                _gameStateService.UpdateTurn(game);
            }

            await _gameRepository.UpdateGameAsync(game);

            // Notify all players about the card return
            await _hubContext.Clients.Group(game.Id).SendAsync("CardReturned", new
            {
                PlayerId = player.UserId,
                CardName = "hidden"
            });

            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return new OkResult();
        }

        public async Task<(bool IsSuccess, string Message)> HandleBlockResponseAsync(Game game, string blockerId, bool isChallenge)
        {
            if (isChallenge)
            {
                return await HandleChallengeBlockAsync(game, blockerId);
            }
            else
            {
                return await HandleAcceptBlockAsync(game);
            }
        }

        public async Task<(bool IsSuccess, string Message)> HandleChallengeBlockAsync(Game game, string challengerId)
        {
            if (game.PendingAction == null || game.PendingAction.ActionType != "blockAttempt")
            {
                return (false, "No block action to challenge.");
            }

            var blocker = game.Players.FirstOrDefault(p => p.UserId == game.PendingAction.InitiatorId);
            var challenger = game.Players.FirstOrDefault(p => p.UserId == challengerId);

            if (blocker == null || !blocker.IsActive || challenger == null || !challenger.IsActive)
            {
                return (false, "Blocker or challenger not found or inactive.");
            }

            var blockParameters = game.PendingAction.Parameters as BlockActionParameters;
            if (blockParameters == null)
            {
                return (false, "Invalid block parameters.");
            }
            var blockOption = blockParameters.BlockOption;
            bool blockerHasCard = blocker.Hand.Any(c => c.Name.ToLower() == blockOption.ToLower() && !c.IsRevealed);

            if (blockerHasCard)
            {
                // Challenger loses an influence
                challenger.Influences--;

                var cardToReveal = challenger.Hand.Where(c => !c.IsRevealed).OrderBy(c => Guid.NewGuid()).FirstOrDefault();
                if (cardToReveal != null)
                {
                    cardToReveal.IsRevealed = true;
                }

                // Draw a card for the blocker
                var drawnCard = game.CentralDeck.OrderBy(c => Guid.NewGuid()).FirstOrDefault();
                if (drawnCard != null)
                {
                    blocker.Hand.Add(drawnCard);

                    // Create a pending action for selecting a card to return
                    var returnCardAction = new PendingAction
                    {
                        ActionType = "ReturnCard",
                        OriginalActionType = game.PendingAction.OriginalActionType,
                        InitiatorId = blocker.UserId,
                        IsActionResolved = false,
                        Responses = new Dictionary<string, string>()
                    };
                    game.PendingAction = returnCardAction;

                    await _gameRepository.UpdateGameAsync(game);

                    // Notify the blocker to select a card to return
                    await _hubContext.Clients.User(blocker.UserId).SendAsync("PromptReturnCard", new
                    {
                        PlayerHand = blocker.Hand.Select(c => c.Name).ToList()
                    });
                }

                await _hubContext.Clients.Group(game.Id.ToString()).SendAsync("BlockSuccessful", blocker.Username, cardToReveal?.Name);
                return (true, "Block successful. Challenger lost an influence. Blocker to return a card.");
            }
            else
            {
                // Blocker loses an influence
                blocker.Influences--;

                // Select a random card from the blocker's hand to set isRevealed to true
                var cardToReveal = blocker.Hand.Where(c => !c.IsRevealed).OrderBy(c => Guid.NewGuid()).FirstOrDefault();
                if (cardToReveal != null)
                {
                    cardToReveal.IsRevealed = true;
                }

                // Challenge succeeds, execute the original action
                game.PendingAction = new PendingAction
                {
                    ActionType = game.PendingAction.OriginalActionType,
                    InitiatorId = game.PendingAction.TargetId, // This should be the original action initiator
                    TargetId = game.PendingAction.InitiatorId, // This should be the blocker
                    IsActionResolved = false
                };

                await HandleActionAsync(game, game.PendingAction, false);

                Console.WriteLine(game.PendingAction.ActionType);
                if (game.PendingAction.ActionType != "exchangeSelect")
                {
                    game.PendingAction = null;
                }

                await _gameRepository.UpdateGameAsync(game);
                _gameStateService.UpdateTurn(game);
                await _hubContext.Clients.Group(game.Id.ToString()).SendAsync("ChallengeSucceeded", blocker.Username, cardToReveal?.Name);
                return (true, "Challenge succeeded. Blocker lost an influence. Original action to be executed.");
            }
        }

        public async Task<(bool IsSuccess, string Message)> HandleAcceptBlockAsync(Game game)
        {
            if (game.PendingAction == null || game.PendingAction.ActionType != "blockAttempt")
            {
                return (false, "No block action to accept.");
            }

            // Block is accepted, cancel the original action, but if the action costs something (assassinate and coup), remove the coin from the player
            var action = game.PendingAction;
            if (action.ActionType == "assassinate" || action.ActionType == "coup")
            {
                var player = game.Players.FirstOrDefault(p => p.UserId == action.InitiatorId);
                if (player != null)
                {
                    if (player.Coins >= (action.ActionType == "assassinate" ? 3 : 7))
                    {
                        player.Coins -= action.ActionType == "assassinate" ? 3 : 7;
                    }
                    else
                    {
                        return (false, "Player does not have enough coins to pay for the action.");
                    }
                }
            }

            game.PendingAction = null;
            _gameStateService.UpdateTurn(game);
            await _gameRepository.UpdateGameAsync(game);

            await _hubContext.Clients.Group(game.Id.ToString()).SendAsync("BlockAccepted");
            return (true, "Block accepted, action cancelled.");
        }
    }
}
