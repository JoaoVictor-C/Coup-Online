 namespace CoupGameBackend.Services
{
    public interface ISchedulingService
    {
        void ScheduleGameDeletion(string gameId);
        void CancelScheduledDeletion(string gameId);
    }
}