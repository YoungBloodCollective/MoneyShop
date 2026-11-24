using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

public class ClientCoDebtorServiceTests
{
    private const int BrokerA = 11;
    private const int BrokerB = 12;
    private const int Client = 100;
    private const int Signed = 101;
    private const int SignedToo = 102;
    private const int NotSigned = 103;
    private const int OtherBrokerClient = 200;

    private sealed class Rig
    {
        public MoneyShopDbContext Db { get; init; } = null!;
        public ClientCoDebtorService Service { get; init; } = null!;
    }

    private static Rig Build()
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        Utilizatori U(int id, string nume, string prenume, string? phone = null) =>
            new() { IdUtilizator = id, Nume = nume, Prenume = prenume, NumarTelefon = phone, IdRol = 1 };
        db.Utilizatoris.AddRange(
            U(Client, "Popescu", "Ion", "0722000100"), U(Signed, "Popescu", "Maria", "0722000101"), U(SignedToo, "Ionescu", "Vasile", "0722000102"),
            U(NotSigned, "Nesemnat", "Dan", "0722000103"), U(OtherBrokerClient, "Altul", "Client", "0733000200"));
        AcordClient Acord(int user, int broker, string status, string prenume, string nume, string phone) =>
            new() { UserId = user, BrokerProfileId = broker, Token = Guid.NewGuid().ToString("N"), Nume = nume, Prenume = prenume, Telefon = phone, Status = status, SignedAt = DateTime.UtcNow.AddDays(-user) };
        db.AcordClients.AddRange(
            Acord(Client, BrokerA, "completed", "Ion", "Popescu", "0722000100"),
            Acord(Signed, BrokerA, "completed", "Maria", "Popescu", "0722000101"),
            Acord(SignedToo, BrokerA, "completed", "Vasile", "Ionescu", "0722000102"),
            Acord(NotSigned, BrokerA, "started", "Dan", "Nesemnat", "0722000103"),
            Acord(OtherBrokerClient, BrokerB, "completed", "Client", "Altul", "0733000200"));
        db.SaveChanges();
        db.BrokerScopeId = BrokerA;
        return new Rig { Db = db, Service = new ClientCoDebtorService(db, NullLogger<ClientCoDebtorService>.Instance) };
    }

    private static CoDebtorCreateInput Input(int user, string relation = CoDebtorRelations.Parinte) => new() { CoDebtorUserId = user, Relation = relation };

    [Fact]
    public async Task Links_a_client_who_signed_the_acord_with_the_relation()
    {
        var rig = Build();
        var result = await rig.Service.AddAsync(Client, Input(Signed));
        Assert.Equal(CoDebtorError.None, result.Error);
        Assert.Equal("Părinte", result.Item!.RelationLabel);
        Assert.Equal("Maria Popescu", result.Item.FullName);
        var row = rig.Db.ClientCoDebtors.Single();
        Assert.Equal(BrokerA, row.BrokerProfileId);
        Assert.Equal(Client, row.ClientUserId);
        Assert.Equal(Signed, row.CoDebtorUserId);
        var view = rig.Service.Get(Client);
        Assert.Single(view.CoDebtors);
        Assert.Empty(view.CoDebtorFor);
    }

    [Fact]
    public async Task Rejects_self_and_unknown_relation()
    {
        var rig = Build();
        Assert.Equal(CoDebtorError.Self, (await rig.Service.AddAsync(Client, Input(Client))).Error);
        Assert.Equal(CoDebtorError.InvalidRelation, (await rig.Service.AddAsync(Client, Input(Signed, "Bunic"))).Error);
        Assert.Equal(CoDebtorError.InvalidRelation, (await rig.Service.AddAsync(Client, Input(Signed, ""))).Error);
        Assert.Empty(rig.Db.ClientCoDebtors);
    }

    [Fact]
    public async Task Rejects_duplicate_and_reverse_duplicate()
    {
        var rig = Build();
        Assert.Equal(CoDebtorError.None, (await rig.Service.AddAsync(Client, Input(Signed))).Error);
        Assert.Equal(CoDebtorError.Duplicate, (await rig.Service.AddAsync(Client, Input(Signed, CoDebtorRelations.Frate))).Error);
        Assert.Equal(CoDebtorError.Duplicate, (await rig.Service.AddAsync(Signed, Input(Client, CoDebtorRelations.Copil))).Error);
        Assert.Single(rig.Db.ClientCoDebtors);
    }

    [Fact]
    public async Task Rejects_a_candidate_without_a_completed_acord()
    {
        var rig = Build();
        Assert.Equal(CoDebtorError.NoAcord, (await rig.Service.AddAsync(Client, Input(NotSigned))).Error);
        Assert.Equal(CoDebtorError.NoAcord, (await rig.Service.AddAsync(Client, Input(9999))).Error);
        Assert.Empty(rig.Db.ClientCoDebtors);
    }

    [Fact]
    public async Task Rejects_a_client_of_another_broker()
    {
        var rig = Build();
        Assert.Equal(CoDebtorError.NoAcord, (await rig.Service.AddAsync(Client, Input(OtherBrokerClient))).Error);
        Assert.Equal(CoDebtorError.ClientNotVisible, (await rig.Service.AddAsync(OtherBrokerClient, Input(Signed))).Error);
        rig.Db.BrokerScopeId = null;
        Assert.Equal(CoDebtorError.DifferentBroker, (await rig.Service.AddAsync(Client, Input(OtherBrokerClient))).Error);
        rig.Db.BrokerScopeId = -1;
        Assert.Equal(CoDebtorError.ClientNotVisible, (await rig.Service.AddAsync(Client, Input(Signed))).Error);
        Assert.Empty(rig.Db.ClientCoDebtors.IgnoreQueryFilters());
    }

    [Fact]
    public async Task Super_admin_links_two_clients_of_the_same_broker_under_that_broker()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = null;
        var result = await rig.Service.AddAsync(Client, Input(Signed));
        Assert.Equal(CoDebtorError.None, result.Error);
        Assert.Equal(BrokerA, rig.Db.ClientCoDebtors.Single().BrokerProfileId);
    }

    [Fact]
    public async Task Reverse_side_shows_the_inverse_relation()
    {
        var rig = Build();
        await rig.Service.AddAsync(Client, Input(Signed, CoDebtorRelations.Parinte));
        await rig.Service.AddAsync(Client, Input(SignedToo, CoDebtorRelations.Sot));
        var parent = rig.Service.Get(Signed);
        Assert.Empty(parent.CoDebtors);
        var back = Assert.Single(parent.CoDebtorFor);
        Assert.Equal(Client, back.UserId);
        Assert.Equal(CoDebtorRelations.Copil, back.Relation);
        Assert.Equal("Copil", back.RelationLabel);
        var spouse = Assert.Single(rig.Service.Get(SignedToo).CoDebtorFor);
        Assert.Equal(CoDebtorRelations.Sot, spouse.Relation);
        Assert.Equal(CoDebtorRelations.Parinte, CoDebtorRelations.Inverse(CoDebtorRelations.Copil));
    }

    [Fact]
    public async Task Candidates_exclude_self_unsigned_other_brokers_and_linked_and_are_searchable()
    {
        var rig = Build();
        var all = rig.Service.SearchCandidates(Client, null);
        Assert.Equal(new[] { Signed, SignedToo }.OrderBy(x => x), all.Select(c => c.UserId).OrderBy(x => x));
        Assert.Equal(Signed, all[0].UserId);
        Assert.Equal(new[] { SignedToo }, rig.Service.SearchCandidates(Client, "ionescu").Select(c => c.UserId));
        Assert.Equal(new[] { Signed }, rig.Service.SearchCandidates(Client, "0722000101").Select(c => c.UserId));
        Assert.Empty(rig.Service.SearchCandidates(Client, "x"));
        await rig.Service.AddAsync(Client, Input(Signed));
        Assert.Equal(new[] { SignedToo }, rig.Service.SearchCandidates(Client, null).Select(c => c.UserId));
        Assert.DoesNotContain(rig.Service.SearchCandidates(Signed, null), c => c.UserId == Client);
    }

    [Fact]
    public async Task Delete_is_scoped_to_the_broker_and_the_client()
    {
        var rig = Build();
        var id = (await rig.Service.AddAsync(Client, Input(Signed))).Item!.Id;
        Assert.False(await rig.Service.RemoveAsync(Signed, id));
        rig.Db.BrokerScopeId = BrokerB;
        Assert.False(await rig.Service.RemoveAsync(Client, id));
        Assert.Single(rig.Db.ClientCoDebtors.IgnoreQueryFilters());
        rig.Db.BrokerScopeId = BrokerA;
        Assert.True(await rig.Service.RemoveAsync(Client, id));
        Assert.Empty(rig.Db.ClientCoDebtors);
    }
}
