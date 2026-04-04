using MoneyShop.ServiceAdapters.Services.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using FluentAssertions;
using Moq;
using ApplicationEntity = MoneyShop.DomainModel.Entities.Application;

namespace MoneyShop.Tests.Services;

public class ApplicationServiceTests
{
    private readonly Mock<IApplicationRepository> _mockAppRepo;
    private readonly Mock<MoneyShopDbContext> _mockContext;
    private readonly ApplicationService _service;

    public ApplicationServiceTests()
    {
        _mockAppRepo = new Mock<IApplicationRepository>();
        _mockContext = new Mock<MoneyShopDbContext>();
        _service = new ApplicationService(_mockAppRepo.Object, _mockContext.Object);
    }

    [Fact]
    public void CreateApplication_SetsStatusToInregistrat()
    {
        var app = new ApplicationEntity { UserId = 1, TypeCredit = "NP", RequestedAmount = 50000 };
        _mockAppRepo.Setup(r => r.Insert(It.IsAny<ApplicationEntity>())).Returns(app);

        var result = _service.CreateApplication(app);

        result.Status.Should().Be("INREGISTRAT");
    }

    [Fact]
    public void CreateApplication_SetsTimestamps()
    {
        var app = new ApplicationEntity { UserId = 1 };
        _mockAppRepo.Setup(r => r.Insert(It.IsAny<ApplicationEntity>())).Returns(app);
        var before = DateTime.UtcNow;

        var result = _service.CreateApplication(app);

        result.CreatedAt.Should().BeOnOrAfter(before);
        result.UpdatedAt.Should().BeOnOrAfter(before);
    }

    [Fact]
    public void CreateApplication_CallsRepositoryInsert()
    {
        var app = new ApplicationEntity { UserId = 1 };
        _mockAppRepo.Setup(r => r.Insert(It.IsAny<ApplicationEntity>())).Returns(app);

        _service.CreateApplication(app);

        _mockAppRepo.Verify(r => r.Insert(It.IsAny<ApplicationEntity>()), Times.Once);
    }

    [Fact]
    public void CreateApplication_CallsSaveChanges()
    {
        var app = new ApplicationEntity { UserId = 1 };
        _mockAppRepo.Setup(r => r.Insert(It.IsAny<ApplicationEntity>())).Returns(app);

        _service.CreateApplication(app);

        _mockContext.Verify(c => c.SaveChanges(), Times.Once);
    }

    [Fact]
    public void GetApplicationById_ExistingId_ReturnsApplication()
    {
        var apps = new List<ApplicationEntity>
        {
            new() { Id = 1, UserId = 1, Status = "INREGISTRAT" },
            new() { Id = 2, UserId = 2, Status = "IN_ANALIZA" },
        }.AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        var result = _service.GetApplicationById(1);

        result.Should().NotBeNull();
        result!.Id.Should().Be(1);
    }

    [Fact]
    public void GetApplicationById_NonExistingId_ReturnsNull()
    {
        var apps = new List<ApplicationEntity>().AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        var result = _service.GetApplicationById(999);

        result.Should().BeNull();
    }

    [Fact]
    public void GetUserApplications_ReturnsOnlyUserApps()
    {
        var apps = new List<ApplicationEntity>
        {
            new() { Id = 1, UserId = 1, CreatedAt = DateTime.UtcNow },
            new() { Id = 2, UserId = 2, CreatedAt = DateTime.UtcNow },
            new() { Id = 3, UserId = 1, CreatedAt = DateTime.UtcNow.AddMinutes(-1) },
        }.AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        var result = _service.GetUserApplications(1);

        result.Should().HaveCount(2);
        result.All(a => a.UserId == 1).Should().BeTrue();
    }

    [Fact]
    public void GetUserApplications_OrdersByCreatedAtDescending()
    {
        var older = DateTime.UtcNow.AddDays(-1);
        var newer = DateTime.UtcNow;
        var apps = new List<ApplicationEntity>
        {
            new() { Id = 1, UserId = 1, CreatedAt = older },
            new() { Id = 2, UserId = 1, CreatedAt = newer },
        }.AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        var result = _service.GetUserApplications(1);

        result.First().Id.Should().Be(2);
    }

    [Fact]
    public void UpdateApplication_SetsUpdatedAt()
    {
        var app = new ApplicationEntity { Id = 1, Status = "IN_ANALIZA" };
        _mockAppRepo.Setup(r => r.Update(It.IsAny<ApplicationEntity>())).Returns(app);
        var before = DateTime.UtcNow;

        var result = _service.UpdateApplication(app);

        result.UpdatedAt.Should().BeOnOrAfter(before);
    }

    [Fact]
    public void UpdateApplicationStatus_ExistingApp_ChangesStatus()
    {
        var app = new ApplicationEntity { Id = 1, Status = "INREGISTRAT" };
        var apps = new List<ApplicationEntity> { app }.AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);
        _mockAppRepo.Setup(r => r.Update(It.IsAny<ApplicationEntity>())).Returns(app);

        _service.UpdateApplicationStatus(1, "PREAPROBAT");

        app.Status.Should().Be("PREAPROBAT");
        _mockAppRepo.Verify(r => r.Update(It.IsAny<ApplicationEntity>()), Times.Once);
    }

    [Fact]
    public void UpdateApplicationStatus_NonExistingApp_DoesNothing()
    {
        var apps = new List<ApplicationEntity>().AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        _service.UpdateApplicationStatus(999, "PREAPROBAT");

        _mockAppRepo.Verify(r => r.Update(It.IsAny<ApplicationEntity>()), Times.Never);
    }

    [Fact]
    public void DeleteApplication_ExistingApp_CallsDelete()
    {
        var app = new ApplicationEntity { Id = 1 };
        var apps = new List<ApplicationEntity> { app }.AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        _service.DeleteApplication(1);

        _mockAppRepo.Verify(r => r.Delete(app), Times.Once);
    }

    [Fact]
    public void DeleteApplication_NonExistingApp_DoesNothing()
    {
        var apps = new List<ApplicationEntity>().AsQueryable();
        _mockAppRepo.Setup(r => r.Get()).Returns(apps);

        _service.DeleteApplication(999);

        _mockAppRepo.Verify(r => r.Delete(It.IsAny<ApplicationEntity>()), Times.Never);
    }
}
