using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.Repositories.Application;
using MoneyShop.DomainServices.Repositories.Kyc;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;

namespace MoneyShop.Tests.Crm;

public class CrmServiceClientUnionTests
{
    internal const int BrokerId = 7;
    internal const int OtherBrokerId = 8;
    internal const int AcordOnlyUser = 101;
    internal const int FileOnlyUser = 102;
    internal const int BothUser = 103;
    internal const int OtherBrokerUser = 104;

    internal static (CrmService Service, MoneyShopDbContext Db) Build()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);

        db.Utilizatoris.AddRange(
            User(AcordOnlyUser, "", ""),
            User(FileOnlyUser, "Ionescu", "Maria"),
            User(BothUser, "Popescu", "Ion"),
            User(OtherBrokerUser, "Alt", "Client"));

        db.AcordClients.AddRange(
            Acord(BrokerId, AcordOnlyUser, "signed", "Vasile", "Andrei", new DateTime(2026, 11, 10)),
            Acord(BrokerId, BothUser, "started", "Popescu", "Ion", new DateTime(2026, 11, 1)),
            Acord(OtherBrokerId, OtherBrokerUser, "signed", "Alt", "Client", new DateTime(2026, 11, 12)));

        db.Applications.AddRange(
            App(BrokerId, FileOnlyUser, "IN_ANALIZA", new DateTime(2026, 11, 5)),
            App(BrokerId, BothUser, "TRIMIS_LA_BANCA", new DateTime(2026, 11, 8)),
            App(OtherBrokerId, OtherBrokerUser, "RESPINS", new DateTime(2026, 11, 12)));

        db.SaveChanges();
        db.BrokerScopeId = BrokerId;

        var service = new CrmService(
            new ApplicationRepository(db),
            new KycFileRepository(db),
            db,
            new ConfigurationBuilder().Build());
        return (service, db);
    }

    private static Utilizatori User(int id, string nume, string prenume) => new()
    {
        IdUtilizator = id,
        Nume = nume,
        Prenume = prenume,
        IdRol = 1,
    };

    private static AcordClient Acord(int broker, int userId, string status, string nume, string prenume, DateTime at) => new()
    {
        BrokerProfileId = broker,
        UserId = userId,
        Token = Guid.NewGuid().ToString("N"),
        Nume = nume,
        Prenume = prenume,
        Telefon = "0700000000",
        Status = status,
        CreatedAt = at,
        UpdatedAt = at,
        SignedAt = status == "signed" ? at : null,
    };

    private static MoneyShop.DomainModel.Entities.Application App(int broker, int userId, string status, DateTime at) => new()
    {
        BrokerProfileId = broker,
        UserId = userId,
        Status = status,
        CreatedAt = at,
        UpdatedAt = at,
    };

    [Fact]
    public void GetClients_returns_union_of_acord_and_file_clients_scoped_to_broker()
    {
        var (service, _) = Build();

        var clients = service.GetClients();

        Assert.Equal(3, clients.Count);
        Assert.DoesNotContain(clients, c => c.UserId == OtherBrokerUser);

        var acordOnly = clients.Single(c => c.UserId == AcordOnlyUser);
        Assert.True(acordOnly.HasAcord);
        Assert.Equal(0, acordOnly.FilesCount);
        Assert.Null(acordOnly.LastStatus);
        Assert.Equal("signed", acordOnly.AcordStatus);
        Assert.Equal("Andrei Vasile", acordOnly.FullName);

        var fileOnly = clients.Single(c => c.UserId == FileOnlyUser);
        Assert.False(fileOnly.HasAcord);
        Assert.Equal(1, fileOnly.FilesCount);
        Assert.Equal("IN_ANALIZA", fileOnly.LastStatus);
        Assert.Null(fileOnly.AcordId);

        var both = clients.Single(c => c.UserId == BothUser);
        Assert.True(both.HasAcord);
        Assert.Equal(1, both.FilesCount);
        Assert.Equal("TRIMIS_LA_BANCA", both.LastStatus);
        Assert.Equal("started", both.AcordStatus);

        Assert.Equal(new[] { AcordOnlyUser, BothUser, FileOnlyUser }, clients.Select(c => c.UserId).ToArray());
    }

    [Fact]
    public void GetClient_for_acord_only_user_has_no_financial_and_no_files()
    {
        var (service, _) = Build();

        var client = service.GetClient(AcordOnlyUser);

        Assert.NotNull(client);
        Assert.Null(client!.Financial);
        Assert.Empty(client.Files);
        Assert.Empty(client.Documents);
        Assert.Equal("signed", client.AcordStatus);
        Assert.NotNull(client.AcordSignedAt);
        Assert.Equal("Andrei Vasile", client.FullName);
    }

    [Fact]
    public void GetClient_for_file_only_user_has_financial_snapshot()
    {
        var (service, _) = Build();

        var client = service.GetClient(FileOnlyUser);

        Assert.NotNull(client);
        Assert.NotNull(client!.Financial);
        Assert.Single(client.Files);
        Assert.Null(client.AcordId);
    }

    [Fact]
    public void GetClient_returns_null_for_other_brokers_user()
    {
        var (service, _) = Build();

        Assert.Null(service.GetClient(OtherBrokerUser));
    }

    [Fact]
    public void GetClients_without_broker_scope_returns_every_client()
    {
        var (service, db) = Build();
        db.BrokerScopeId = null;

        Assert.Equal(4, service.GetClients().Count);
    }

    [Fact]
    public void GetClients_with_no_broker_scope_returns_nothing()
    {
        var (service, db) = Build();
        db.BrokerScopeId = -1;

        Assert.Empty(service.GetClients());
    }
}
