using System.Linq;
using System.Threading.Tasks;
using CoupGameBackend.Models;
using System.Text.Json;

namespace CoupGameBackend.Services
{
    public class ChallengeService : IChallengeService
    {
        private readonly IGameRepository _gameRepository;

        public ChallengeService(IGameRepository gameRepository)
        {
            _gameRepository = gameRepository;
        }

        public async Task<(bool IsSuccess, string Message, bool? HasRole)> HandleChallengeAsync(Game game, string challengerId)
        {
            if (game == null)
                return (false, "Game not found.", null);

            var initiator = game.Players.FirstOrDefault(p => p.UserId == game.PendingAction.InitiatorId);
            if (initiator == null)
                return (false, "Initiator not found.", null);

            string requiredRole = GetRoleForAction(game.PendingAction.ActionType);
            if (string.IsNullOrEmpty(requiredRole))
                return (false, "Invalid action type for challenge.", null);

            bool hasRole = initiator.Hand.Any(c => c.Name.Equals(requiredRole, StringComparison.OrdinalIgnoreCase) && !c.IsRevealed);
            if (hasRole)
            {
                var challenger = game.Players.FirstOrDefault(p => p.UserId == challengerId);
                if (challenger != null)
                {
                    challenger.Influences -= 1;
                    if (challenger.Influences <= 0)
                        challenger.IsActive = false;

                    var challengeLog = new ActionLog
                    {
                        Timestamp = DateTime.UtcNow,
                        PlayerId = challengerId,
                        Action = $"Challenge Failed Against {game.PendingAction.ActionType}"
                    };

                    // Select one random card from the challenger to put it on isRevealed false
                    var cardToReveal = challenger.Hand.Where(c => !c.IsRevealed).OrderBy(c => Guid.NewGuid()).FirstOrDefault();
                    if (cardToReveal != null)
                    {
                        cardToReveal.IsRevealed = true;
                    }
                    game.ActionsHistory.Add(challengeLog);
                    await _gameRepository.UpdateGameAsync(game);
                }
            }
            else
            {
                initiator.Influences -= 1;
                if (initiator.Influences <= 0)
                    initiator.IsActive = false;

                var challengeSuccessLog = new ActionLog
                {
                    Timestamp = DateTime.UtcNow,
                    PlayerId = challengerId,
                    Action = $"Challenge Successful Against {game.PendingAction.ActionType}"
                };
                game.ActionsHistory.Add(challengeSuccessLog);

                var unrevealedCards = initiator.Hand.Where(c => !c.IsRevealed).ToList();
                if (unrevealedCards.Any())
                {
                    var cardToReveal = unrevealedCards.OrderBy(c => Guid.NewGuid()).FirstOrDefault();
                    if (cardToReveal != null)
                    {
                        cardToReveal.IsRevealed = true;
                    }

                    var revealLog = new ActionLog
                    {
                        Timestamp = DateTime.UtcNow,
                        PlayerId = initiator.UserId,
                        Action = $"Revealed {cardToReveal.Name} due to failed challenge"
                    };
                    game.ActionsHistory.Add(revealLog);
                }

                await _gameRepository.UpdateGameAsync(game);
            }
            return (true, "Challenge resolved.", hasRole);
        }


        public async Task<(bool IsSuccess, string Message)> HandleBlockAsync(Game game, string blockerId, string? blockOption)
        {
            var blocker = game.Players.FirstOrDefault(p => p.UserId == blockerId);
            if (blocker == null || !blocker.IsActive)
            {
                throw new Exception("Blocker not found or inactive.");
            }

            // Set the block as pending challenge
            game.PendingAction = new PendingAction
            {
                ActionType = "blockAttempt",
                InitiatorId = blockerId, // This is the player who is blocking
                TargetId = game.PendingAction.InitiatorId, // This is the player who is being blocked, or the player who did the action
                Parameters = new BlockActionParameters
                {
                    BlockOption = blockOption
                },
            };

            await _gameRepository.UpdateGameAsync(game);

            return (true, "Blocked action.");
        }

        private string GetRoleForAction(string actionType)
        {
            return actionType.ToLower() switch
            {
                "steal" => "Captain",
                "assassinate" => "Assassin",
                "exchange" => "Ambassador",
                "tax" => "Duke",
                _ => ""
            };
        }
    }
}
