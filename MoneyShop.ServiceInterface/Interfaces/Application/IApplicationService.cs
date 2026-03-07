using ApplicationEntity = MoneyShop.DomainModel.Entities.Application;

namespace MoneyShop.ServiceInterface.Interfaces.Application
{
    public interface IApplicationService
    {
        ApplicationEntity CreateApplication(ApplicationEntity application);
        ApplicationEntity? GetApplicationById(int id);
        List<ApplicationEntity> GetUserApplications(int userId);
        ApplicationEntity UpdateApplication(ApplicationEntity application);
        void UpdateApplicationStatus(int applicationId, string status);
        void DeleteApplication(int id);
    }
}
