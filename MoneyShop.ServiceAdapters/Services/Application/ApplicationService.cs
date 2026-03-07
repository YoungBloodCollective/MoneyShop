using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Text.Json;
using System.Linq;
using System;
using ApplicationEntity = MoneyShop.DomainModel.Entities.Application;

namespace MoneyShop.ServiceAdapters.Services.Application;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationRepository _applicationRepository;
    private readonly MoneyShopDbContext _context;

    public ApplicationService(
        IApplicationRepository applicationRepository,
        MoneyShopDbContext context)
    {
        _applicationRepository = applicationRepository;
        _context = context;
    }

    public ApplicationEntity CreateApplication(ApplicationEntity application)
    {
        application.Status = "INREGISTRAT";
        application.CreatedAt = DateTime.UtcNow;
        application.UpdatedAt = DateTime.UtcNow;

        _applicationRepository.Insert(application);
        _context.SaveChanges();

        return application;
    }

    public ApplicationEntity? GetApplicationById(int id)
    {
        return _applicationRepository.Get()
            .FirstOrDefault(a => a.Id == id);
    }

    public List<ApplicationEntity> GetUserApplications(int userId)
    {
        return _applicationRepository.Get()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToList();
    }

    public ApplicationEntity UpdateApplication(ApplicationEntity application)
    {
        application.UpdatedAt = DateTime.UtcNow;
        _applicationRepository.Update(application);
        _context.SaveChanges();

        return application;
    }

    public void UpdateApplicationStatus(int applicationId, string status)
    {
        var application = GetApplicationById(applicationId);
        if (application != null)
        {
            application.Status = status;
            application.UpdatedAt = DateTime.UtcNow;
            _applicationRepository.Update(application);
            _context.SaveChanges();
        }
    }

    public void DeleteApplication(int id)
    {
        var application = GetApplicationById(id);
        if (application != null)
        {
            _applicationRepository.Delete(application);
            _context.SaveChanges();
        }
    }
}
