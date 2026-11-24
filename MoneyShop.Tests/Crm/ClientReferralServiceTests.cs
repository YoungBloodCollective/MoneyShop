using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Broker;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

public class ClientReferralServiceTests
{
    private const int Referrer = 11;
    private const int Receiver = 12;
    private const int Third = 13;
    private const int Suspended = 14;
    private const int ReferrerClient = 100;
    private const int ThirdClient = 101;
    private const int ReceiverClient = 200;
    private const int ReceiverOtherClient = 201;

    private sealed class FixedTime : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2030, 1, 7, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class FakeMessenger : IReferralMessenger
    {
        public List<ReferralConsentMessage> Consents { get; } = new();
        public List<(string To, string From, string Client, string? Phone, bool Collab)> Received { get; } = new();
        public List<(string To, string Client, string Bank, string Status)> Statuses { get; } = new();
        public bool ThrowOnStatus { get; set; }

        public Task<ReferralDelivery> SendConsentRequestAsync(ReferralConsentMessage message)
        {
            Consents.Add(message);
            return Task.FromResult(new ReferralDelivery { Sms = true, Email = !string.IsNullOrEmpty(message.Email) });
        }

        public Task<bool> NotifyReceivedAsync(string toEmail, string fromName, string clientName, string? phone, bool collaboration, string crmUrl)
        {
            Received.Add((toEmail, fromName, clientName, phone, collaboration));
            return Task.FromResult(true);
        }

        public Task<bool> NotifyStatusAsync(string toEmail, string clientName, string bankName, string statusLabel)
        {
            if (ThrowOnStatus) throw new InvalidOperationException("Brevo is down");
            Statuses.Add((toEmail, clientName, bankName, statusLabel));
            return Task.FromResult(true);
        }
    }

    private sealed class Rig
    {
        public MoneyShopDbContext Db { get; init; } = null!;
        public ClientReferralService Service { get; init; } = null!;
        public FakeMessenger Messenger { get; init; } = null!;
        public FixedTime Time { get; init; } = null!;
        public int BankId { get; init; }
    }

    private static Rig Build()
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        Utilizatori U(int id, string nume, string prenume, string? mail = null, string? phone = null) =>
            new() { IdUtilizator = id, Nume = nume, Prenume = prenume, Mail = mail, NumarTelefon = phone, IdRol = 1 };
        var brokerUsers = new[]
        {
            U(1, "Popa", "Ana", "ana@example.com"), U(2, "Rus", "Bogdan", "bogdan@example.com"),
            U(3, "Pop", "Cristi", "cristi@example.com"), U(4, "Lung", "Dan", "dan@example.com"),
        };
        db.Utilizatoris.AddRange(brokerUsers);
        db.Utilizatoris.AddRange(U(ReferrerClient, "Popescu", "Ion", null, "0722000111"), U(ThirdClient, "Alt", "Client"), U(ReceiverClient, "Popescu", "Ion"), U(ReceiverOtherClient, "Ceilalt", "Client"));
        db.BrokerProfiles.AddRange(
            new BrokerProfile { Id = Referrer, User = brokerUsers[0], Slug = "ana", DisplayName = "Ana Popa", Oras = "București", Judet = "București", Type = BrokerTypes.Afiliat },
            new BrokerProfile { Id = Receiver, User = brokerUsers[1], Slug = "bogdan", DisplayName = "Bogdan Rus", Oras = "Cluj-Napoca", Judet = "Cluj", Type = BrokerTypes.Afiliat, NotificationEmail = "bogdan-crm@example.com" },
            new BrokerProfile { Id = Third, User = brokerUsers[2], Slug = "cristi", DisplayName = "Cristi Pop", Oras = "Cluj-Napoca", Judet = "Cluj", Type = BrokerTypes.MoneyShop },
            new BrokerProfile { Id = Suspended, User = brokerUsers[3], Slug = "dan", DisplayName = "Dan Lung", Oras = "Cluj-Napoca", Judet = "Cluj", Status = "Suspended" });
        db.AcordClients.AddRange(
            new AcordClient { UserId = ReferrerClient, BrokerProfileId = Referrer, Token = "a", Nume = "Popescu", Prenume = "Ion", Telefon = "0722000111", Email = "ion@example.com" },
            new AcordClient { UserId = ThirdClient, BrokerProfileId = Third, Token = "b", Nume = "Alt", Prenume = "Client", Telefon = "0733000222" });
        var bank = new Bank { Name = "BCR", CommissionPercent = 2, Active = true };
        db.Banks.Add(bank);
        db.SaveChanges();

        var messenger = new FakeMessenger();
        var time = new FixedTime();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Brokers:RootDomain"] = "moneyshop.test" }).Build();
        var service = new ClientReferralService(db, new CommissionCalculator(db), messenger, config, NullLogger<ClientReferralService>.Instance, time);
        return new Rig { Db = db, Service = service, Messenger = messenger, Time = time, BankId = bank.Id };
    }

    private static string TokenOf(Rig rig, int consentIndex = 0)
    {
        var url = rig.Messenger.Consents[consentIndex].Url;
        return Uri.UnescapeDataString(url.Substring(url.IndexOf("#t=", StringComparison.Ordinal) + 3));
    }

    private static async Task<ReferralItem> Send(Rig rig, string mode = ReferralModes.Colaborare, int to = Receiver, string? note = null)
    {
        rig.Db.BrokerScopeId = Referrer;
        var result = await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = to, Mode = mode, Note = note });
        Assert.Equal(ReferralError.None, result.Error);
        return result.Referral!;
    }

    private static async Task<ReferralItem> Accepted(Rig rig, string mode = ReferralModes.Colaborare, string? note = null)
    {
        var sent = await Send(rig, mode, note: note);
        var answer = await rig.Service.RespondAsync(TokenOf(rig, rig.Messenger.Consents.Count - 1), true, "203.0.113.9", "TestAgent/1.0");
        Assert.True(answer.Accepted);
        return sent;
    }

    private static void ClientSignedWithReceiver(Rig rig)
    {
        var lead = rig.Db.LeadCaptures.IgnoreQueryFilters().Single();
        lead.UserId = ReceiverClient;
        lead.Status = LeadStatuses.Converted;
        rig.Db.SaveChanges();
    }

    private static BankFile File(Rig rig, int user, string status, decimal amount, string type = CreditTypes.Np, int broker = Receiver)
    {
        var f = new BankFile
        {
            BrokerProfileId = broker, UserId = user, BankId = rig.BankId, BankName = "BCR", CreditType = type, Amount = amount,
            Status = status, StatusChangedAt = rig.Time.Now.UtcDateTime, Notes = "nota privată", CreatedAt = rig.Time.Now.UtcDateTime, UpdatedAt = rig.Time.Now.UtcDateTime,
        };
        rig.Db.BankFiles.Add(f);
        rig.Db.SaveChanges();
        return f;
    }

    [Fact]
    public async Task Only_a_broker_who_owns_the_client_can_refer_it()
    {
        var rig = Build();

        rig.Db.BrokerScopeId = Receiver;
        Assert.Equal(ReferralError.ClientNotVisible, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Third })).Error);

        rig.Db.BrokerScopeId = Referrer;
        Assert.Equal(ReferralError.ClientNotVisible, (await rig.Service.CreateAsync(ThirdClient, new ReferralCreateInput { ToBrokerProfileId = Receiver })).Error);

        rig.Db.BrokerScopeId = null;
        Assert.Equal(ReferralError.NotBroker, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver })).Error);

        Assert.Empty(rig.Db.ClientReferrals);
        Assert.Empty(rig.Messenger.Consents);
    }

    [Fact]
    public async Task Self_referral_duplicates_unknown_and_suspended_targets_and_bad_input_are_refused()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = Referrer;

        Assert.Equal(ReferralError.SelfReferral, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Referrer })).Error);
        Assert.Equal(ReferralError.TargetNotFound, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = 999 })).Error);
        Assert.Equal(ReferralError.TargetNotFound, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Suspended })).Error);
        Assert.Equal(ReferralError.TargetNotFound, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput())).Error);
        Assert.Equal(ReferralError.InvalidMode, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver, Mode = "Cadou" })).Error);
        Assert.Equal(ReferralError.NoteTooLong, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver, Note = new string('x', 501) })).Error);
        Assert.Empty(rig.Db.ClientReferrals);

        await Send(rig);
        Assert.Equal(ReferralError.Duplicate, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver, Mode = ReferralModes.Transfer })).Error);
        Assert.Equal(ReferralError.None, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Third })).Error);
        Assert.Equal(2, rig.Db.ClientReferrals.Count());
    }

    [Fact]
    public async Task A_new_referral_can_follow_an_expired_one_but_not_an_accepted_one()
    {
        var rig = Build();
        await Send(rig);
        rig.Time.Now = rig.Time.Now.AddDays(8);
        Assert.Equal(ReferralError.None, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver })).Error);

        await rig.Service.RespondAsync(TokenOf(rig, 1), true, null, null);
        Assert.Equal(ReferralError.Duplicate, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver })).Error);
    }

    [Fact]
    public async Task Creating_stores_only_the_token_hash_sends_the_link_and_sets_mode_share_and_expiry()
    {
        var rig = Build();
        var note = "Client serios, vrea un credit de nevoi personale.";
        var colab = await Send(rig, note: note);
        var transfer = await Send(rig, ReferralModes.Transfer, Third);

        var token = TokenOf(rig);
        var rows = rig.Db.ClientReferrals.OrderBy(r => r.Id).ToList();
        Assert.Equal(new[] { 50, 0 }, rows.Select(r => r.SharePercent).ToArray());
        Assert.Equal(new[] { ReferralModes.Colaborare, ReferralModes.Transfer }, rows.Select(r => r.Mode).ToArray());
        Assert.All(rows, r => Assert.Equal(ReferralStatuses.AsteaptaClient, r.Status));
        Assert.All(rows, r => Assert.Equal(rig.Time.Now.UtcDateTime.AddDays(7), r.ConsentExpiresAt));
        Assert.DoesNotContain(rows, r => r.ConsentTokenHash == token);
        Assert.Equal(BrokerInviteService.HashToken(token), rows[0].ConsentTokenHash);
        Assert.Equal(note, rows[0].Note);

        var message = rig.Messenger.Consents[0];
        Assert.StartsWith("https://moneyshop.test/colaborare#t=", message.Url);
        Assert.Equal("0722000111", message.Phone);
        Assert.Equal("ion@example.com", message.Email);
        Assert.Equal("Ana Popa", message.FromName);
        Assert.Equal("Bogdan Rus", message.ToName);
        Assert.True(message.Collaboration);
        Assert.False(rig.Messenger.Consents[1].Collaboration);
        Assert.Equal("Popescu Ion", colab.ClientName);
        Assert.NotEqual(rows[0].ConsentTokenHash, rows[1].ConsentTokenHash);
        Assert.Equal(ReferralModes.Transfer, transfer.Mode);
    }

    [Fact]
    public async Task The_consent_page_shows_who_recommends_whom_and_nothing_about_the_client()
    {
        var rig = Build();
        await Send(rig);

        var preview = rig.Service.PreviewConsent(TokenOf(rig));

        Assert.Equal(ReferralConsentError.None, preview.Error);
        Assert.Equal("Ana Popa", preview.View!.FromName);
        Assert.Equal("Bogdan Rus", preview.View.ToName);
        Assert.Equal("Cluj-Napoca", preview.View.ToOras);
        Assert.Equal(ReferralModes.Colaborare, preview.View.Mode);
        Assert.Equal(50, preview.View.SharePercent);
        Assert.Equal(new[] { "ExpiresAt", "FromName", "Mode", "SharePercent", "ToName", "ToOras" }, typeof(ReferralConsentView).GetProperties().Select(p => p.Name).OrderBy(n => n).ToArray());
    }

    [Fact]
    public async Task Unknown_malformed_and_empty_tokens_find_nothing()
    {
        var rig = Build();
        await Send(rig);

        foreach (var token in new[] { null, "", "short", "not a token!!not a token!!not a token!!", new string('A', 43), TokenOf(rig) + "x" })
        {
            Assert.Equal(ReferralConsentError.NotFound, rig.Service.PreviewConsent(token).Error);
            Assert.Equal(ReferralConsentError.NotFound, (await rig.Service.RespondAsync(token, true, null, null)).Error);
        }
        Assert.Empty(rig.Db.LeadCaptures.IgnoreQueryFilters());
        Assert.Equal(ReferralStatuses.AsteaptaClient, rig.Db.ClientReferrals.Single().Status);
    }

    [Fact]
    public async Task An_expired_token_is_refused_and_creates_nothing()
    {
        var rig = Build();
        await Send(rig);
        var token = TokenOf(rig);

        rig.Time.Now = rig.Time.Now.AddDays(7).AddSeconds(1);

        Assert.Equal(ReferralConsentError.Expired, rig.Service.PreviewConsent(token).Error);
        Assert.Equal(ReferralConsentError.Expired, (await rig.Service.RespondAsync(token, true, null, null)).Error);
        Assert.Empty(rig.Db.LeadCaptures.IgnoreQueryFilters());
        Assert.Equal(ReferralStatuses.Expirat, rig.Db.ClientReferrals.Single().Status);
    }

    [Fact]
    public async Task Just_before_expiry_the_token_still_works()
    {
        var rig = Build();
        await Send(rig);
        rig.Time.Now = rig.Time.Now.AddDays(7).AddSeconds(-1);

        Assert.True((await rig.Service.RespondAsync(TokenOf(rig), true, null, null)).Accepted);
    }

    [Fact]
    public async Task A_token_answers_once()
    {
        var rig = Build();
        await Send(rig);
        var token = TokenOf(rig);

        Assert.True((await rig.Service.RespondAsync(token, true, "203.0.113.9", "UA")).Accepted);
        Assert.Equal(ReferralConsentError.Answered, (await rig.Service.RespondAsync(token, true, "203.0.113.10", "UA2")).Error);
        Assert.Equal(ReferralConsentError.Answered, (await rig.Service.RespondAsync(token, false, null, null)).Error);
        Assert.Equal(ReferralConsentError.Answered, rig.Service.PreviewConsent(token).Error);

        Assert.Single(rig.Db.LeadCaptures.IgnoreQueryFilters());
        var referral = rig.Db.ClientReferrals.Single();
        Assert.Equal(ReferralStatuses.Acceptat, referral.Status);
        Assert.Equal("203.0.113.9", referral.ConsentIp);
    }

    [Fact]
    public async Task Declining_creates_no_lead_and_records_the_answer()
    {
        var rig = Build();
        await Send(rig);

        var answer = await rig.Service.RespondAsync(TokenOf(rig), false, "203.0.113.9", "Mozilla/5.0 test");

        Assert.Equal(ReferralConsentError.None, answer.Error);
        Assert.False(answer.Accepted);
        Assert.Empty(rig.Db.LeadCaptures.IgnoreQueryFilters());
        Assert.Empty(rig.Messenger.Received);
        var referral = rig.Db.ClientReferrals.Single();
        Assert.Equal(ReferralStatuses.Refuzat, referral.Status);
        Assert.Null(referral.LeadId);
        Assert.Equal(rig.Time.Now.UtcDateTime, referral.ConsentAt);
        Assert.Equal("203.0.113.9", referral.ConsentIp);
        Assert.Equal("Mozilla/5.0 test", referral.ConsentUserAgent);
    }

    [Fact]
    public async Task Accepting_creates_exactly_one_lead_in_the_receivers_scope_with_contact_data_and_the_note()
    {
        var rig = Build();
        var sent = await Send(rig, note: "Vrea credit în 2 săptămâni");
        var token = TokenOf(rig);

        var answer = await rig.Service.RespondAsync(token, true, "203.0.113.9", "UA");
        await rig.Service.RespondAsync(token, true, "203.0.113.9", "UA");

        Assert.True(answer.Accepted);
        var lead = rig.Db.LeadCaptures.IgnoreQueryFilters().Single();
        Assert.Equal(Receiver, lead.BrokerProfileId);
        Assert.Equal("colaborare", lead.Source);
        Assert.Equal(LeadStatuses.New, lead.Status);
        Assert.Equal("Popescu Ion", lead.NumePrenume);
        Assert.Equal("0722000111", lead.Telefon);
        Assert.Equal("ion@example.com", lead.Email);
        Assert.Contains("Lead primit de la Ana Popa", lead.AdminNotes);
        Assert.Contains("Vrea credit în 2 săptămâni", lead.AdminNotes);
        Assert.Null(lead.UserId);

        var referral = rig.Db.ClientReferrals.Single();
        Assert.Equal(lead.Id, referral.LeadId);
        Assert.Equal(sent.Id, referral.Id);

        rig.Db.BrokerScopeId = Receiver;
        Assert.Single(rig.Db.LeadCaptures);
        rig.Db.BrokerScopeId = Referrer;
        Assert.Empty(rig.Db.LeadCaptures);
        rig.Db.BrokerScopeId = Third;
        Assert.Empty(rig.Db.LeadCaptures);

        var notice = Assert.Single(rig.Messenger.Received);
        Assert.Equal("bogdan-crm@example.com", notice.To);
        Assert.Equal("Ana Popa", notice.From);
        Assert.Equal("Popescu Ion", notice.Client);
        Assert.True(notice.Collab);
    }

    [Fact]
    public async Task A_transfer_creates_a_transfer_lead_and_the_lead_shows_who_sent_it()
    {
        var rig = Build();
        await Accepted(rig, ReferralModes.Transfer);

        var lead = rig.Db.LeadCaptures.IgnoreQueryFilters().Single();
        Assert.Equal("transfer", lead.Source);

        rig.Db.BrokerScopeId = Receiver;
        Assert.Equal("Ana Popa", rig.Service.ReceivedFromByLead(new[] { lead.Id })[lead.Id]);
        rig.Db.BrokerScopeId = Third;
        Assert.Empty(rig.Service.ReceivedFromByLead(new[] { lead.Id }));
        rig.Db.BrokerScopeId = null;
        Assert.Single(rig.Service.ReceivedFromByLead(new[] { lead.Id }));
    }

    [Fact]
    public async Task The_receiver_learns_the_client_and_the_note_only_after_acceptance()
    {
        var rig = Build();
        await Send(rig, note: "Notă pentru Bogdan");

        rig.Db.BrokerScopeId = Receiver;
        var pending = rig.Service.GetOverview().Received.Single();
        Assert.Null(pending.ClientName);
        Assert.Null(pending.ClientUserId);
        Assert.Null(pending.Note);
        Assert.Equal("Ana Popa", pending.FromBrokerName);

        await rig.Service.RespondAsync(TokenOf(rig), true, null, null);
        rig.Db.BrokerScopeId = Receiver;
        var accepted = rig.Service.GetOverview().Received.Single();
        Assert.Equal("Popescu Ion", accepted.ClientName);
        Assert.Equal("Notă pentru Bogdan", accepted.Note);
        Assert.Null(accepted.ClientUserId);
        Assert.Null(accepted.Files);
    }

    [Fact]
    public async Task The_referrer_sees_the_receivers_files_for_that_client_only_after_acceptance_and_only_for_a_collaboration()
    {
        var rig = Build();
        await Send(rig);
        File(rig, ReceiverClient, BankFileStatuses.Analiza, 50000);

        rig.Db.BrokerScopeId = Referrer;
        Assert.Null(rig.Service.GetOverview().Sent.Single().Files);

        await rig.Service.RespondAsync(TokenOf(rig), true, null, null);
        rig.Db.BrokerScopeId = Referrer;
        Assert.Empty(rig.Service.GetOverview().Sent.Single().Files!);

        ClientSignedWithReceiver(rig);
        File(rig, ReceiverClient, BankFileStatuses.Trimis, 80000, CreditTypes.Ip);
        File(rig, ReceiverOtherClient, BankFileStatuses.Disbursat, 999000);
        File(rig, ReceiverClient, BankFileStatuses.Disbursat, 70000, CreditTypes.Np, Third);

        rig.Db.BrokerScopeId = Referrer;
        var item = rig.Service.GetOverview().Sent.Single();
        Assert.Equal(2, item.Files!.Count);
        Assert.All(item.Files, f => Assert.Equal("BCR", f.BankName));
        Assert.Equal(new[] { 50000m, 80000m }, item.Files.Select(f => f.Amount).OrderBy(a => a).ToArray());
        Assert.Equal(new[] { "ANALIZA", "TRIMIS" }, item.Files.Select(f => f.Status).OrderBy(a => a).ToArray());
        Assert.Equal(new[] { "Amount", "BankName", "CreditType", "Status", "StatusChangedAt" }, typeof(ReferralFileItem).GetProperties().Select(p => p.Name).OrderBy(n => n).ToArray());

        rig.Db.BrokerScopeId = Third;
        Assert.Empty(rig.Service.GetOverview().Sent);
        Assert.Empty(rig.Service.GetOverview().Received);

        rig.Db.BrokerScopeId = Receiver;
        var received = rig.Service.GetOverview().Received.Single();
        Assert.Null(received.Files);
    }

    [Fact]
    public async Task A_transfer_gives_the_referrer_no_visibility_and_no_share()
    {
        var rig = Build();
        await Accepted(rig, ReferralModes.Transfer);
        ClientSignedWithReceiver(rig);
        File(rig, ReceiverClient, BankFileStatuses.Disbursat, 100000);

        rig.Db.BrokerScopeId = Referrer;
        var item = rig.Service.GetOverview().Sent.Single();
        Assert.Equal(ReferralStatuses.Acceptat, item.Status);
        Assert.Equal(0, item.SharePercent);
        Assert.Null(item.Files);
        Assert.Null(item.ShareAmount);

        rig.Db.BrokerScopeId = Receiver;
        Assert.Null(rig.Service.GetOverview().Received.Single().ShareAmount);
    }

    [Fact]
    public async Task The_files_of_a_client_who_has_another_lead_owner_are_not_shown()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        File(rig, ReceiverClient, BankFileStatuses.Analiza, 50000);
        var lead = rig.Db.LeadCaptures.IgnoreQueryFilters().Single();
        lead.BrokerProfileId = Third;
        rig.Db.SaveChanges();

        rig.Db.BrokerScopeId = Referrer;
        Assert.Empty(rig.Service.GetOverview().Sent.Single().Files!);
    }

    [Fact]
    public async Task The_share_is_half_of_the_commission_the_calculator_gives_the_receivers_disbursed_files()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        File(rig, ReceiverClient, BankFileStatuses.Disbursat, 100000);
        File(rig, ReceiverClient, BankFileStatuses.Trimis, 500000);

        rig.Db.BrokerScopeId = Referrer;
        Assert.Equal(1000m, rig.Service.GetOverview().Sent.Single().ShareAmount);

        rig.Db.BrokerScopeId = Receiver;
        Assert.Equal(1000m, rig.Service.GetOverview().Received.Single().ShareAmount);

        rig.Db.BrokerScopeId = null;
        Assert.Equal(1000m, rig.Service.GetOverview().All!.Single().ShareAmount);
    }

    [Fact]
    public async Task The_share_follows_the_tiers_and_the_receivers_override_of_the_calculator()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        File(rig, ReceiverClient, BankFileStatuses.Disbursat, 100000);
        rig.Db.BrokerBankCommissions.Add(new BrokerBankCommission { BrokerProfileId = Receiver, BankId = rig.BankId, CommissionPercent = 3.5m });
        rig.Db.SaveChanges();

        rig.Db.BrokerScopeId = Referrer;
        Assert.Equal(1750m, rig.Service.GetOverview().Sent.Single().ShareAmount);

        var receiver = rig.Db.BrokerProfiles.Single(p => p.Id == Receiver);
        receiver.Type = BrokerTypes.MoneyShop;
        rig.Db.BankCommissionTiers.Add(new BankCommissionTier { BankId = rig.BankId, CreditType = CreditTypes.Np, FromAmount = 0, ToAmount = null, Percent = 4m });
        rig.Db.SaveChanges();

        Assert.Equal(2000m, rig.Service.GetOverview().Sent.Single().ShareAmount);
    }

    [Fact]
    public async Task Only_the_referrer_can_cancel_and_only_while_the_client_has_not_answered()
    {
        var rig = Build();
        var sent = await Send(rig);
        var token = TokenOf(rig);

        rig.Db.BrokerScopeId = Receiver;
        Assert.True(rig.Service.Cancel(sent.Id).NotFound);
        rig.Db.BrokerScopeId = Third;
        Assert.True(rig.Service.Cancel(sent.Id).NotFound);

        rig.Db.BrokerScopeId = Referrer;
        Assert.True(rig.Service.GetOverview().Sent.Single().CanCancel);
        Assert.True(rig.Service.Cancel(sent.Id).Success);
        Assert.Equal(ReferralStatuses.Anulat, rig.Db.ClientReferrals.Single().Status);
        Assert.Equal(ReferralConsentError.Cancelled, rig.Service.PreviewConsent(token).Error);
        Assert.Equal(ReferralConsentError.Cancelled, (await rig.Service.RespondAsync(token, true, null, null)).Error);
        Assert.Empty(rig.Db.LeadCaptures.IgnoreQueryFilters());
        Assert.False(rig.Service.Cancel(sent.Id).Success);

        await Send(rig);
        await rig.Service.RespondAsync(TokenOf(rig, 1), true, null, null);
        rig.Db.BrokerScopeId = Referrer;
        var accepted = rig.Service.GetOverview().Sent.First(r => r.Status == ReferralStatuses.Acceptat);
        Assert.False(accepted.CanCancel);
        Assert.False(rig.Service.Cancel(accepted.Id).Success);
        Assert.Equal(ReferralStatuses.Acceptat, rig.Db.ClientReferrals.Single(r => r.Id == accepted.Id).Status);
    }

    [Fact]
    public async Task An_expired_pending_referral_is_listed_as_expired_and_cannot_be_cancelled_from_the_list()
    {
        var rig = Build();
        await Send(rig);
        rig.Time.Now = rig.Time.Now.AddDays(8);

        rig.Db.BrokerScopeId = Referrer;
        var item = rig.Service.GetOverview().Sent.Single();

        Assert.Equal(ReferralStatuses.Expirat, item.Status);
        Assert.False(item.CanCancel);
    }

    [Fact]
    public async Task The_super_admin_sees_every_referral()
    {
        var rig = Build();
        await Send(rig);
        await Send(rig, ReferralModes.Transfer, Third);

        rig.Db.BrokerScopeId = null;
        var overview = rig.Service.GetOverview();

        Assert.Equal(2, overview.All!.Count);
        Assert.Empty(overview.Sent);
        Assert.Empty(overview.Received);
        Assert.All(overview.All, r => Assert.Equal("Popescu Ion", r.ClientName));

        rig.Db.BrokerScopeId = Referrer;
        Assert.Null(rig.Service.GetOverview().All);
    }

    [Fact]
    public void The_directory_returns_no_contact_data_and_skips_the_caller_and_inactive_brokers()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = Receiver;
        rig.Db.BrokerProfiles.Single(p => p.Id == Third).PublicPhone = "0700 123 456";
        rig.Db.BrokerProfiles.Single(p => p.Id == Third).PublicEmail = "cristi@public.example";
        rig.Db.SaveChanges();

        var byCity = rig.Service.SearchBrokers(null, "cluj", null);

        var hit = Assert.Single(byCity);
        Assert.Equal(Third, hit.Id);
        Assert.Equal("Cristi Pop", hit.DisplayName);
        Assert.Equal("Cluj-Napoca", hit.Oras);
        Assert.Equal("Cluj", hit.Judet);
        Assert.Equal(BrokerTypes.MoneyShop, hit.Type);
        Assert.Equal(new[] { "DisplayName", "Id", "Judet", "Oras", "Type" }, typeof(BrokerDirectoryItem).GetProperties().Select(p => p.Name).OrderBy(n => n).ToArray());
        var json = System.Text.Json.JsonSerializer.Serialize(byCity);
        Assert.DoesNotContain("0700", json);
        Assert.DoesNotContain("public.example", json);
        Assert.DoesNotContain("cristi@example.com", json);
    }

    [Fact]
    public void The_directory_matches_by_name_or_county_and_does_not_dump_the_network_for_an_empty_search()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = Receiver;

        Assert.Empty(rig.Service.SearchBrokers(null, null, null));
        Assert.Empty(rig.Service.SearchBrokers("a", null, null));
        Assert.Equal(new[] { Referrer }, rig.Service.SearchBrokers("ana", null, null).Select(b => b.Id).ToArray());
        Assert.Equal(new[] { Third }, rig.Service.SearchBrokers(null, null, "cluj").Select(b => b.Id).ToArray());
        Assert.Equal(new[] { Referrer }, rig.Service.SearchBrokers(null, null, "Bucuresti").Select(b => b.Id).ToArray());
        Assert.Equal(new[] { Third }, rig.Service.SearchBrokers("cristi", "Cluj", "Cluj").Select(b => b.Id).ToArray());
        Assert.Empty(rig.Service.SearchBrokers("bogdan", null, null));
    }

    private static (ReferralStatusQueue Queue, CrmWorkService Work, int BankId) Notifying(Rig rig)
    {
        var queue = new ReferralStatusQueue();
        var notifier = new ReferralNotifier(rig.Db, queue, NullLogger<ReferralNotifier>.Instance);
        return (queue, new CrmWorkService(rig.Db, notifier), rig.BankId);
    }

    private static async Task Drain(ReferralStatusQueue queue, FakeMessenger messenger)
    {
        while (queue.Reader.TryRead(out var email))
            await ReferralStatusQueue.DeliverAsync(messenger, email, NullLogger.Instance);
    }

    [Fact]
    public async Task A_stage_change_by_the_receiver_emails_the_referrer_of_a_collaboration()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        var (queue, work, bankId) = Notifying(rig);
        rig.Db.BrokerScopeId = Receiver;

        var created = work.AddBankFile(ReceiverClient, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Trimis });
        work.UpdateBankFile(created.Id, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 70000, Status = BankFileStatuses.Trimis });
        work.UpdateBankFile(created.Id, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 70000, Status = BankFileStatuses.AprobatFinal });
        Assert.Empty(rig.Messenger.Statuses);
        await Drain(queue, rig.Messenger);

        Assert.Equal(2, rig.Messenger.Statuses.Count);
        Assert.All(rig.Messenger.Statuses, s => Assert.Equal("ana@example.com", s.To));
        Assert.Equal(("ana@example.com", "Popescu Ion", "BCR", "Trimis"), rig.Messenger.Statuses[0]);
        Assert.Equal(("ana@example.com", "Popescu Ion", "BCR", "Aprobat final"), rig.Messenger.Statuses[1]);
    }

    [Fact]
    public async Task No_status_email_for_a_transfer_a_pending_referral_or_another_client()
    {
        var rig = Build();
        await Send(rig);
        var (queue, work, bankId) = Notifying(rig);
        rig.Db.BrokerScopeId = Receiver;
        var input = new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Trimis };

        work.AddBankFile(ReceiverClient, input);
        await Drain(queue, rig.Messenger);
        Assert.Empty(rig.Messenger.Statuses);

        await rig.Service.RespondAsync(TokenOf(rig), true, null, null);
        ClientSignedWithReceiver(rig);
        rig.Db.BrokerScopeId = Receiver;
        work.AddBankFile(ReceiverOtherClient, input);
        await Drain(queue, rig.Messenger);
        Assert.Empty(rig.Messenger.Statuses);

        rig.Db.ClientReferrals.Single().Mode = ReferralModes.Transfer;
        rig.Db.SaveChanges();
        work.AddBankFile(ReceiverClient, input);
        await Drain(queue, rig.Messenger);
        Assert.Empty(rig.Messenger.Statuses);
    }

    [Fact]
    public async Task A_failing_email_never_fails_the_bank_file_update()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        rig.Messenger.ThrowOnStatus = true;
        var (queue, work, bankId) = Notifying(rig);
        rig.Db.BrokerScopeId = Receiver;

        var created = work.AddBankFile(ReceiverClient, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Trimis });
        var updated = work.UpdateBankFile(created.Id, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Respins });
        await Drain(queue, rig.Messenger);

        Assert.Equal(BankFileStatuses.Respins, updated!.Status);
        Assert.Equal(BankFileStatuses.Respins, rig.Db.BankFiles.Single().Status);
    }

    [Fact]
    public async Task A_closed_queue_does_not_fail_the_update()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        var (queue, work, bankId) = Notifying(rig);
        queue.Complete();
        rig.Db.BrokerScopeId = Receiver;

        var created = work.AddBankFile(ReceiverClient, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Trimis });

        Assert.Equal(BankFileStatuses.Trimis, created.Status);
        Assert.Equal(BankFileStatuses.Trimis, rig.Db.BankFiles.Single().Status);
    }

    [Fact]
    public async Task A_status_email_is_queued_not_sent_on_the_request_path()
    {
        var rig = Build();
        await Accepted(rig);
        ClientSignedWithReceiver(rig);
        var (queue, work, bankId) = Notifying(rig);
        rig.Db.BrokerScopeId = Receiver;

        work.AddBankFile(ReceiverClient, new CrmBankFileInput { BankId = bankId, CreditType = CreditTypes.Np, Amount = 60000, Status = BankFileStatuses.Trimis });

        Assert.Empty(rig.Messenger.Statuses);
        Assert.True(queue.Reader.TryRead(out var email));
        Assert.Equal("ana@example.com", email!.To);
    }

    [Fact]
    public async Task A_client_without_a_phone_cannot_be_referred_in_either_mode()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = Referrer;
        rig.Db.AcordClients.Single(a => a.UserId == ReferrerClient).Telefon = "";
        rig.Db.Utilizatoris.Single(u => u.IdUtilizator == ReferrerClient).NumarTelefon = null;
        rig.Db.SaveChanges();

        foreach (var mode in new[] { ReferralModes.Colaborare, ReferralModes.Transfer })
            Assert.Equal(ReferralError.NoPhone, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver, Mode = mode })).Error);
        Assert.Empty(rig.Db.ClientReferrals);
    }

    [Fact]
    public async Task A_client_gets_at_most_three_referrals_per_rolling_day_across_brokers()
    {
        var rig = Build();
        rig.Db.BrokerScopeId = Referrer;
        rig.Db.BrokerProfiles.Add(new BrokerProfile { Id = 15, User = rig.Db.Utilizatoris.First(u => u.IdUtilizator == 4), Slug = "extra", DisplayName = "Extra Broker", Oras = "Iași", Judet = "Iași", Type = BrokerTypes.Afiliat });
        rig.Db.SaveChanges();

        foreach (var to in new[] { Receiver, Third, 15 })
            Assert.Equal(ReferralError.None, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = to })).Error);
        rig.Time.Now = rig.Time.Now.AddHours(1);
        Assert.Equal(ReferralError.TooManyForClient, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Receiver, Mode = ReferralModes.Transfer })).Error);
        Assert.Equal(3, rig.Db.ClientReferrals.Count());

        rig.Time.Now = rig.Time.Now.AddDays(8);
        Assert.Equal(ReferralError.None, (await rig.Service.CreateAsync(ReferrerClient, new ReferralCreateInput { ToBrokerProfileId = Third })).Error);
    }

    [Fact]
    public void Broker_names_in_messages_lose_links_control_characters_and_length()
    {
        Assert.Equal("Ana Popa", ReferralMessenger.SafeName("  Ana\u0007 Popa  "));
        Assert.Equal("Ana Popa", ReferralMessenger.SafeName("Ana https://evil.example/x?y=1 Popa"));
        Assert.Equal("Ana Popa", ReferralMessenger.SafeName("Ana www.evil.ro Popa"));
        Assert.Equal("Ana Popa", ReferralMessenger.SafeName("Ana evil.com/login Popa"));
        Assert.Equal("Ana\nPopa".Replace("\n", " "), ReferralMessenger.SafeName("Ana\nPopa"));
        Assert.Equal("un coleg", ReferralMessenger.SafeName("http://evil.ro"));
        Assert.Equal(60, ReferralMessenger.SafeName(new string('a', 200)).Length);
        Assert.Equal("Ion P. Rus", ReferralMessenger.SafeName("Ion P. Rus"));
    }
}
