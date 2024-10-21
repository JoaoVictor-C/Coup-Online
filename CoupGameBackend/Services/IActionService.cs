using System.Threading.Tasks;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.Mvc;

namespace CoupGameBackend.Services
{
    public interface IActionService
    {
        Task<IActionResult> HandleIncomeAction(Game game, Player player);
        Task<IActionResult> HandleForeignAidAction(Game game, Player player);
        Task<IActionResult> HandleCoupAction(Game game, Player player, CoupActionParameters parameters);
        Task<IActionResult> HandleStealAction(Game game, Player player, StealActionParameters parameters);
        Task<IActionResult> HandleAssassinateAction(Game game, Player player, AssassinateActionParameters parameters);
        Task<IActionResult> HandleExchangeAction(Game game, Player player);
        Task<IActionResult> HandleTaxAction(Game game, Player player);
        Task<IActionResult> HandleActionAsync(Game game, PendingAction pendingAction, bool updateTurn = true);
        Task<IActionResult> PerformAction(string gameId, string userId, string action, string? targetId);
        Task<(bool IsSuccess, string Message)> ProcessPendingActionResponse(string gameId, string userId, string response, string? blockOption);
        Task<IActionResult> ExecuteDrawCardAsync(Game game, PendingAction pendingAction);
        Task<IActionResult> HandleReturnCardResponseAsync(Game game, string playerId, string cardId);
        Task<(bool IsSuccess, string Message)> HandleExchangeSelectResponseAsync(Game game, string userId, string card1, string card2);
        Task<(bool IsSuccess, string Message)> HandleBlockResponseAsync(Game game, string blockerId, bool isChallenge);
    }
}
