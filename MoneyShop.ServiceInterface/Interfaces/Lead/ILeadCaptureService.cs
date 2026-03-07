using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Dtos.Lead;

namespace MoneyShop.ServiceInterface.Interfaces.Lead
{
    public interface ILeadCaptureService
    {
        Task<LeadCapture> CreateLeadAsync(int? userId, LeadCaptureRequest request, string source = "api");
        Task<LeadSession?> LoadSessionAsync(string sessionKey);
        Task<LeadSession> SaveSessionAsync(LeadSession session);
        Task<LeadSession> InitSessionAsync(int? userId, string? conversationId);
        Task ClearSessionAsync(string sessionKey);
    }
}
