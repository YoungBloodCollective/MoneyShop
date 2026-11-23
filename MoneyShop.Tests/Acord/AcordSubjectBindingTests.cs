using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.Repositories.Account;
using MoneyShop.DomainServices.Repositories.Acord;
using MoneyShop.DomainServices.Repositories.Kyc;
using MoneyShop.DomainServices.Repositories.Subject;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Acord;
using MoneyShop.ServiceAdapters.Services.Subject;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.Tests.Acord;

public class AcordSubjectBindingTests
{
    private const string CnpA = "1800101123457";
    private const string CnpB = "2900202987654";
    private const int BrokerOne = 1;
    private const int BrokerTwo = 2;

    public class BrokerStub : DispatchProxy
    {
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            if (targetMethod!.Name == nameof(IBrokerProfileService.ResolveIntakeBrokerId))
                return args![0] is string slug ? int.Parse(slug) : BrokerOne;
            if (targetMethod.Name == nameof(IBrokerProfileService.GetLegalIdentity))
                return new BrokerLegalIdentity { BrokerProfileId = (int)args![0]!, Slug = "b", FirmaNume = "F", FirmaSediu = "S", FirmaCui = "C", FirmaRegCom = "R", FirmaEuid = "E", FirmaDataInfiintarii = "D", ReprezentantNume = "N", ReprezentantTelefon = "T" };
            throw new NotImplementedException(targetMethod.Name);
        }
    }

    private sealed class Rig
    {
        public MoneyShopDbContext Db = null!;
        public SubjectService Subjects = null!;
        public AcordService Acords = null!;
        public BankConsentService Consents = null!;
    }

    private static Rig Build()
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Subject:Pepper1"] = "p1-test",
            ["Subject:Pepper2"] = "p2-test",
            ["Subject:EncryptionKey"] = Convert.ToBase64String(new byte[32].Select((_, i) => (byte)(i + 1)).ToArray()),
        }).Build();
        var subjects = new SubjectService(
            new SubjectMapRepository(db), new CnpAccessLogRepository(db),
            new CnpProtector(config, NullLogger<CnpProtector>.Instance), db, config, NullLogger<SubjectService>.Instance);
        var brokers = DispatchProxy.Create<IBrokerProfileService, BrokerStub>();
        var scopes = new ServiceCollection().BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
        var acords = new AcordService(
            new AcordClientRepository(db), new KycSessionRepository(db), new KycFileRepository(db), new UserRepository(db),
            null!, subjects, null!, null!, scopes, db, config, NullLogger<AcordService>.Instance, brokers, null!);
        var consents = new BankConsentService(db, null!, brokers, subjects, null!, NullLogger<BankConsentService>.Instance);
        return new Rig { Db = db, Subjects = subjects, Acords = acords, Consents = consents };
    }

    private static Utilizatori AddClient(MoneyShopDbContext db, string phone, string? email = null, string? password = null)
    {
        var user = new Utilizatori
        {
            Nume = "Client", Prenume = "Test", NumarTelefon = phone, Mail = email, Parola = password,
            IdRol = 1, IsDeleted = false,
        };
        db.Utilizatoris.Add(user);
        db.SaveChanges();
        return user;
    }

    private static AcordClient AddAcord(MoneyShopDbContext db, int userId, int? broker, string? subjectId = null)
    {
        var acord = new AcordClient
        {
            UserId = userId, BrokerProfileId = broker, SubjectId = subjectId, Token = Guid.NewGuid().ToString("N"),
            Nume = "Client", Prenume = "Test", Telefon = "0700000000",
        };
        db.AcordClients.Add(acord);
        db.SaveChanges();
        return acord;
    }

    private static AcordSubmitInput Input(string phone, int broker, string? email = null) => new()
    {
        Nume = "Nou", Prenume = "Client", Telefon = phone, Email = email, BrokerSlug = broker.ToString(),
        DocumentFront = new AcordUpload { Content = new byte[] { 1 }, FileName = "f.jpg", MimeType = "image/jpeg" },
        SignaturePng = new byte[] { 1 },
        Choices = new AcordSignChoices { AcceptIntermediere = true },
    };

    private static CnpAccessContext Access() => new() { ActorUserId = 99, ActorRole = "Broker", Reason = "admin_view" };

    [Fact]
    public void Reveal_uses_the_acords_own_subject_and_logs_against_the_acord()
    {
        var r = Build();
        var userA = AddClient(r.Db, "0711111111");
        var subjectOfAcord = r.Subjects.GetOrCreateSubject(userA.IdUtilizator, CnpA);
        var acord = AddAcord(r.Db, userA.IdUtilizator, BrokerOne, subjectOfAcord.SubjectId);

        var cnp = r.Acords.RevealCnpForAdmin(acord.AcordId, Access());

        Assert.Equal(CnpA, cnp);
        var log = Assert.Single(r.Db.CnpAccessLogs);
        Assert.Equal(acord.AcordId, log.AcordId);
        Assert.Equal(subjectOfAcord.SubjectId, log.SubjectId);
    }

    [Fact]
    public void Reveal_returns_nothing_when_the_acord_has_no_subject_even_if_the_user_has_one()
    {
        var r = Build();
        var user = AddClient(r.Db, "0711111111");
        r.Subjects.GetOrCreateSubject(user.IdUtilizator, CnpA);
        var acord = AddAcord(r.Db, user.IdUtilizator, BrokerOne);

        Assert.Null(r.Acords.RevealCnpForAdmin(acord.AcordId, Access()));
        Assert.Empty(r.Db.CnpAccessLogs);
    }

    [Fact]
    public void Two_acords_of_one_user_each_reveal_their_own_cnp()
    {
        var r = Build();
        var user = AddClient(r.Db, "0711111111");
        var sa = r.Subjects.GetOrCreateSubject(user.IdUtilizator, CnpA, allowExistingOtherUser: true);
        var sb = r.Subjects.GetOrCreateSubject(user.IdUtilizator, CnpB, allowExistingOtherUser: true);
        var a1 = AddAcord(r.Db, user.IdUtilizator, BrokerOne, sa.SubjectId);
        var a2 = AddAcord(r.Db, user.IdUtilizator, BrokerOne, sb.SubjectId);

        Assert.Equal(CnpA, r.Acords.RevealCnpForAdmin(a1.AcordId, Access()));
        Assert.Equal(CnpB, r.Acords.RevealCnpForAdmin(a2.AcordId, Access()));
    }

    [Fact]
    public async Task Acord_typed_with_another_brokers_client_phone_gets_a_new_user_and_no_foreign_cnp()
    {
        var r = Build();
        var victim = AddClient(r.Db, "0722222222");
        var victimSubject = r.Subjects.GetOrCreateSubject(victim.IdUtilizator, CnpA);
        AddAcord(r.Db, victim.IdUtilizator, BrokerOne, victimSubject.SubjectId);

        var result = await r.Acords.SubmitAsync(Input("0722222222", BrokerTwo), new AcordSignContext());

        Assert.True(result.Success);
        var attacker = r.Db.AcordClients.IgnoreQueryFilters().Single(a => a.AcordId == result.AcordId);
        Assert.NotEqual(victim.IdUtilizator, attacker.UserId);
        Assert.Equal(BrokerTwo, attacker.BrokerProfileId);
        Assert.Null(r.Acords.RevealCnpForAdmin(attacker.AcordId, Access()));
        var untouched = r.Db.Utilizatoris.Single(u => u.IdUtilizator == victim.IdUtilizator);
        Assert.Equal("0722222222", untouched.NumarTelefon);
        Assert.Single(r.Db.AcordClients.IgnoreQueryFilters().Where(a => a.UserId == victim.IdUtilizator));
        var newUser = r.Db.Utilizatoris.Single(u => u.IdUtilizator == attacker.UserId);
        Assert.Null(newUser.NumarTelefon);
    }

    [Fact]
    public async Task Same_broker_returning_client_is_reused()
    {
        var r = Build();
        var client = AddClient(r.Db, "0733333333");
        AddAcord(r.Db, client.IdUtilizator, BrokerOne);
        r.Db.Applications.Add(new Application { UserId = client.IdUtilizator, BrokerProfileId = BrokerOne });
        r.Db.ClientTags.Add(new ClientTag { UserId = client.IdUtilizator, BrokerProfileId = BrokerOne, Tag = "vip" });
        r.Db.SaveChanges();

        var result = await r.Acords.SubmitAsync(Input("0733333333", BrokerOne), new AcordSignContext());

        var acord = r.Db.AcordClients.IgnoreQueryFilters().Single(a => a.AcordId == result.AcordId);
        Assert.Equal(client.IdUtilizator, acord.UserId);
    }

    [Fact]
    public async Task Existing_client_with_a_record_without_broker_is_not_reused()
    {
        var r = Build();
        var client = AddClient(r.Db, "0744444444");
        AddAcord(r.Db, client.IdUtilizator, BrokerOne);
        r.Db.LeadCaptures.Add(new LeadCapture
        {
            UserId = client.IdUtilizator, BrokerProfileId = null, NumePrenume = "X", Telefon = "0744444444", Email = "x@example.com", Oras = "Cluj",
            Source = "appointment", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        r.Db.SaveChanges();

        var result = await r.Acords.SubmitAsync(Input("0744444444", BrokerOne), new AcordSignContext());

        var acord = r.Db.AcordClients.IgnoreQueryFilters().Single(a => a.AcordId == result.AcordId);
        Assert.NotEqual(client.IdUtilizator, acord.UserId);
    }

    [Fact]
    public async Task Self_service_account_holder_is_not_reused()
    {
        var r = Build();
        var holder = AddClient(r.Db, "0755555555", password: "hash");

        var result = await r.Acords.SubmitAsync(Input("0755555555", BrokerOne), new AcordSignContext());

        var acord = r.Db.AcordClients.IgnoreQueryFilters().Single(a => a.AcordId == result.AcordId);
        Assert.NotEqual(holder.IdUtilizator, acord.UserId);
    }

    [Fact]
    public async Task Email_match_of_another_brokers_client_is_not_reused_either()
    {
        var r = Build();
        var other = AddClient(r.Db, "0766666666", "x@example.com");
        AddAcord(r.Db, other.IdUtilizator, BrokerOne);

        var result = await r.Acords.SubmitAsync(Input("0700000001", BrokerTwo, "x@example.com"), new AcordSignContext());

        var acord = r.Db.AcordClients.IgnoreQueryFilters().Single(a => a.AcordId == result.AcordId);
        Assert.NotEqual(other.IdUtilizator, acord.UserId);
    }

    [Fact]
    public void Storing_identity_data_binds_the_subject_to_the_acord()
    {
        var r = Build();
        var user = AddClient(r.Db, "0777777777");
        var acord = AddAcord(r.Db, user.IdUtilizator, BrokerOne);
        var kyc = new KycSession { KycId = Guid.NewGuid(), UserId = user.IdUtilizator, KycType = "ACORD_CLIENT", Status = "pending" };

        typeof(AcordService).GetMethod("StoreIdentityData", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(r.Acords, new object?[] { acord, kyc, new OcrData { Cnp = CnpA }, null });
        r.Db.SaveChanges();

        Assert.NotNull(acord.SubjectId);
        Assert.Equal(CnpA, r.Acords.RevealCnpForAdmin(acord.AcordId, Access()));
    }

    [Fact]
    public void Bank_consent_reads_the_cnp_and_birth_date_from_the_acords_subject()
    {
        var r = Build();
        var user = AddClient(r.Db, "0788888888");
        var subject = r.Subjects.GetOrCreateSubject(user.IdUtilizator, CnpA);
        var bound = AddAcord(r.Db, user.IdUtilizator, BrokerOne, subject.SubjectId);
        var unbound = AddAcord(r.Db, user.IdUtilizator, BrokerOne);

        Assert.True(InvokeHasStoredCnp(r.Consents, bound.AcordId));
        Assert.False(InvokeHasStoredCnp(r.Consents, unbound.AcordId));
        Assert.NotNull(InvokeStoredBirthDate(r.Consents, bound.AcordId));
        Assert.Null(InvokeStoredBirthDate(r.Consents, unbound.AcordId));
    }

    [Fact]
    public void Codebitor_and_consent_cnp_reads_go_through_the_acords_subject()
    {
        var r = Build();
        var user = AddClient(r.Db, "0799999999");
        var subject = r.Subjects.GetOrCreateSubject(user.IdUtilizator, CnpA);
        var bound = AddAcord(r.Db, user.IdUtilizator, BrokerOne, subject.SubjectId);
        var unbound = AddAcord(r.Db, user.IdUtilizator, BrokerOne);

        var method = typeof(BankConsentService).GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
            .Single(m => m.Name == "StoredCnp" && m.GetParameters().Length == 7);
        var boundCnp = method.Invoke(r.Consents, new object?[] { bound.AcordId, bound.SubjectId, "codebitor_form", 5, "Broker", null, null });
        var unboundCnp = method.Invoke(r.Consents, new object?[] { unbound.AcordId, unbound.SubjectId, "codebitor_form", 5, "Broker", null, null });

        Assert.Equal(CnpA, boundCnp);
        Assert.Null(unboundCnp);
        Assert.Equal(bound.AcordId, Assert.Single(r.Db.CnpAccessLogs).AcordId);
    }

    private static bool InvokeHasStoredCnp(BankConsentService s, Guid acordId) =>
        (bool)typeof(BankConsentService).GetMethod("HasStoredCnp", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(s, new object[] { acordId })!;

    private static string? InvokeStoredBirthDate(BankConsentService s, Guid acordId) =>
        (string?)typeof(BankConsentService).GetMethod("StoredBirthDate", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(s, new object[] { acordId });
}
