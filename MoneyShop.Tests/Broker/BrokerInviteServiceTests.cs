using System;
using System.Linq;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Account;
using MoneyShop.ServiceAdapters.Services.Broker;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.Tests.Broker;

public class BrokerInviteServiceTests
{
    private static readonly DateTime Now = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);

    private static MoneyShopDbContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(name).Options);

    private static BrokerInviteService Service(MoneyShopDbContext db) => new(db, NullLogger<BrokerInviteService>.Instance);

    private static (BrokerInviteService Service, MoneyShopDbContext Db) Build()
    {
        var db = NewDb(Guid.NewGuid().ToString());
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 1, Nume = "Admin", Prenume = "Super", Mail = "admin@moneyshop.ro", Username = "admin@moneyshop.ro", IdRol = 1 });
        var broker = new Utilizatori { IdUtilizator = 2, Nume = "Popescu", Prenume = "Ana", Mail = "ana@example.com", Username = "ana@example.com", IdRol = 3, NumarTelefon = "0700000001" };
        db.Utilizatoris.Add(broker);
        db.BrokerProfiles.Add(new BrokerProfile { User = broker, Slug = "ana-popescu", DisplayName = "Ana Popescu" });
        db.SaveChanges();
        return (Service(db), db);
    }

    private static BrokerInviteAcceptInput ValidInput(string slug = "ion-ionescu") => new()
    {
        Nume = "Ionescu",
        Prenume = "Ion",
        Telefon = "0722 111 222",
        Password = "parola-sigura-1",
        PasswordConfirm = "parola-sigura-1",
        Oras = "  Cluj-Napoca ",
        Judet = "Cluj",
        Slug = slug,
        FirmaNume = "Ionescu Consulting SRL",
        FirmaCui = "RO 1234567",
        AcceptTerms = true,
        TermsVersion = BrokerTerms.Version
    };

    private static string Invite(BrokerInviteService service, string email = "ion@example.com", string type = BrokerTypes.MoneyShop)
    {
        var created = service.Create(email, "Ion", type, 1, Now);
        Assert.True(created.Success, created.Error);
        return created.Token!;
    }

    [Fact]
    public void Tokens_are_random_and_only_their_hash_is_stored()
    {
        var (service, db) = Build();
        var first = service.Create("one@example.com", null, BrokerTypes.Afiliat, 1, Now);
        var second = service.Create("two@example.com", null, BrokerTypes.Afiliat, 1, Now);

        Assert.NotEqual(first.Token, second.Token);
        Assert.Equal(43, first.Token!.Length);
        Assert.Matches("^[A-Za-z0-9_-]+$", first.Token);
        var stored = db.BrokerInvites.First(i => i.Id == first.Invite!.Id);
        Assert.NotEqual(first.Token, stored.TokenHash);
        Assert.Equal(BrokerInviteService.HashToken(first.Token), stored.TokenHash);
        Assert.Equal(BrokerInviteService.HashToken(first.Token), BrokerInviteService.HashToken(first.Token));
        Assert.NotEqual(BrokerInviteService.HashToken(first.Token), BrokerInviteService.HashToken(second.Token!));
        Assert.DoesNotContain(first.Token, stored.TokenHash);
    }

    [Fact]
    public void An_invite_lasts_seven_days_then_expires()
    {
        var (service, _) = Build();
        var token = Invite(service);

        Assert.Equal(BrokerInviteError.None, service.Preview(token, Now.AddDays(6).AddHours(23)).Error);
        Assert.Equal(BrokerInviteError.Expired, service.Preview(token, Now.AddDays(7)).Error);
        var expired = service.Accept(token, ValidInput(), "1.2.3.4", Now.AddDays(8));
        Assert.Equal(BrokerInviteError.Expired, expired.InviteError);
        Assert.False(expired.Success);
    }

    [Fact]
    public void Unknown_or_malformed_tokens_are_not_found()
    {
        var (service, _) = Build();
        Invite(service);

        Assert.Equal(BrokerInviteError.NotFound, service.Preview("x", Now).Error);
        Assert.Equal(BrokerInviteError.NotFound, service.Preview("", Now).Error);
        Assert.Equal(BrokerInviteError.NotFound, service.Preview(new string('a', 43), Now).Error);
        Assert.Equal(BrokerInviteError.NotFound, service.Accept(new string('a', 43), ValidInput(), null, Now).InviteError);
    }

    [Fact]
    public void Preview_returns_only_email_name_and_type()
    {
        var (service, _) = Build();
        var token = Invite(service, "ion@example.com", BrokerTypes.Afiliat);

        var preview = service.Preview(token, Now).Invite!;
        Assert.Equal("ion@example.com", preview.Email);
        Assert.Equal("Ion", preview.Name);
        Assert.Equal(BrokerTypes.Afiliat, preview.Type);
        Assert.Equal(3, typeof(BrokerInvitePreview).GetProperties().Length);
    }

    [Fact]
    public void An_invite_can_be_used_only_once()
    {
        var (service, _) = Build();
        var token = Invite(service);

        Assert.True(service.Accept(token, ValidInput(), "1.2.3.4", Now).Success);
        var again = service.Accept(token, ValidInput("alt-slug"), "1.2.3.4", Now);
        Assert.Equal(BrokerInviteError.Used, again.InviteError);
        Assert.Equal(BrokerInviteError.Used, service.Preview(token, Now).Error);
    }

    [Fact]
    public void Single_use_is_enforced_by_the_database_through_concurrency_tokens()
    {
        var invite = NewDb(Guid.NewGuid().ToString()).Model.FindEntityType(typeof(BrokerInvite))!;

        Assert.True(invite.FindProperty(nameof(BrokerInvite.UsedAt))!.IsConcurrencyToken);
        Assert.True(invite.FindProperty(nameof(BrokerInvite.RevokedAt))!.IsConcurrencyToken);
        Assert.True(invite.FindProperty(nameof(BrokerInvite.TokenHash))!.IsConcurrencyToken);
        Assert.True(invite.GetIndexes().Any(i => i.IsUnique && i.Properties.Single().Name == nameof(BrokerInvite.TokenHash)));
    }

    [Fact]
    public void Losing_a_concurrent_accept_reports_the_invite_as_used_and_saves_nothing_else()
    {
        var name = Guid.NewGuid().ToString();
        var token = Invite(Service(NewDb(name)));

        var losing = new RacedDb(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(name).Options);
        var result = Service(losing).Accept(token, ValidInput(), null, Now);

        Assert.Equal(BrokerInviteError.Used, result.InviteError);
        var verify = NewDb(name);
        Assert.Empty(verify.BrokerProfiles);
        Assert.Null(verify.BrokerInvites.Single().UsedAt);
    }

    private sealed class RacedDb : MoneyShopDbContext
    {
        public RacedDb(DbContextOptions<MoneyShopDbContext> options) : base(options) { }

        public override int SaveChanges(bool acceptAllChangesOnSuccess) => throw new DbUpdateConcurrencyException("invite already used");
    }

    [Fact]
    public void Only_sql_unique_violations_map_to_the_duplicate_message()
    {
        Assert.True(BrokerInviteService.IsUniqueViolationNumber(2601));
        Assert.True(BrokerInviteService.IsUniqueViolationNumber(2627));
        Assert.False(BrokerInviteService.IsUniqueViolationNumber(547));
        Assert.False(BrokerInviteService.IsUniqueViolation(new DbUpdateException("x", new InvalidOperationException("y"))));
        Assert.False(BrokerInviteService.IsUniqueViolation(null));
    }

    [Fact]
    public void A_non_unique_save_failure_gives_the_generic_message_and_keeps_the_invite_usable()
    {
        var name = Guid.NewGuid().ToString();
        var token = Invite(Service(NewDb(name)));

        var failing = new FailingDb(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(name).Options);
        var result = Service(failing).Accept(token, ValidInput(), null, Now);

        Assert.Equal(BrokerInviteError.None, result.InviteError);
        Assert.Equal(BrokerInviteService.GenericFailureMessage, result.Error);
        Assert.NotEqual(BrokerInviteService.DuplicateMessage, result.Error);
    }

    [Fact]
    public void Invite_accept_builds_the_account_through_the_shared_builder_with_invite_specifics()
    {
        var (service, db) = Build();
        var token = Invite(service, type: BrokerTypes.Afiliat);
        Assert.True(service.Accept(token, ValidInput(), "1.2.3.4", Now).Success);

        var user = db.Utilizatoris.Single(u => u.Mail == "ion@example.com");
        var profile = db.BrokerProfiles.Single(p => p.Slug == "ion-ionescu");
        Assert.Equal(BrokerProfileService.BROKER_ROLE_ID, user.IdRol);
        Assert.True(user.EmailVerified);
        Assert.Equal(BrokerTypes.Afiliat, profile.Type);
        Assert.Equal("Ion Ionescu", profile.DisplayName);

        var (adminUser, adminProfile) = BrokerProfileService.BuildBrokerAccount("A", "B", "a@b.ro", "0722000000", null, "a-b", false, Now);
        Assert.Equal(BrokerProfileService.BROKER_ROLE_ID, adminUser.IdRol);
        Assert.False(adminUser.EmailVerified);
        Assert.Null(adminUser.Parola);
        Assert.Equal("B A", adminProfile.DisplayName);
    }

    private sealed class FailingDb : MoneyShopDbContext
    {
        public FailingDb(DbContextOptions<MoneyShopDbContext> options) : base(options) { }

        public override int SaveChanges(bool acceptAllChangesOnSuccess) => throw new DbUpdateException("boom", new InvalidOperationException("not a unique violation"));
    }

    [Fact]
    public void A_revoked_invite_stops_working_and_cannot_be_resent()
    {
        var (service, _) = Build();
        var created = service.Create("ion@example.com", null, BrokerTypes.Afiliat, 1, Now);

        var revoked = service.Revoke(created.Invite!.Id, Now.AddHours(1));
        Assert.True(revoked.Success);
        Assert.Equal(BrokerInviteStatuses.Revoked, revoked.Invite!.Status);
        Assert.Equal(BrokerInviteError.Revoked, service.Preview(created.Token!, Now.AddHours(2)).Error);
        Assert.Equal(BrokerInviteError.Revoked, service.Accept(created.Token!, ValidInput(), null, Now.AddHours(2)).InviteError);
        Assert.False(service.Resend(created.Invite.Id, Now.AddHours(2)).Success);
    }

    [Fact]
    public void A_used_invite_cannot_be_revoked_or_resent()
    {
        var (service, _) = Build();
        var created = service.Create("ion@example.com", null, BrokerTypes.Afiliat, 1, Now);
        Assert.True(service.Accept(created.Token!, ValidInput(), null, Now).Success);

        Assert.False(service.Revoke(created.Invite!.Id, Now).Success);
        Assert.False(service.Resend(created.Invite.Id, Now).Success);
    }

    [Fact]
    public void Resending_gives_a_new_token_and_invalidates_the_old_one()
    {
        var (service, _) = Build();
        var created = service.Create("ion@example.com", null, BrokerTypes.Afiliat, 1, Now);

        var later = Now.AddDays(8);
        Assert.Equal(BrokerInviteStatuses.Expired, service.List(later).Single().Status);
        var resent = service.Resend(created.Invite!.Id, later);

        Assert.True(resent.Success);
        Assert.NotEqual(created.Token, resent.Token);
        Assert.Equal(later.AddDays(7), resent.Invite!.ExpiresAt);
        Assert.Equal(BrokerInviteError.NotFound, service.Preview(created.Token!, later).Error);
        Assert.Equal(BrokerInviteError.None, service.Preview(resent.Token!, later).Error);
    }

    [Fact]
    public void Inviting_an_email_that_already_has_an_account_is_refused()
    {
        var (service, _) = Build();

        var broker = service.Create(" ANA@example.com ", null, BrokerTypes.Afiliat, 1, Now);
        Assert.False(broker.Success);
        Assert.Contains("broker", broker.Error);
        Assert.False(service.Create("admin@moneyshop.ro", null, BrokerTypes.Afiliat, 1, Now).Success);
        Assert.Empty(service.List(Now));
    }

    [Fact]
    public void Create_validates_email_type_and_pending_duplicates()
    {
        var (service, _) = Build();

        Assert.False(service.Create("nu-e-email", null, BrokerTypes.Afiliat, 1, Now).Success);
        Assert.False(service.Create("ion@example.com", null, "Admin", 1, Now).Success);
        Assert.False(service.Create("ion@example.com", null, null, 1, Now).Success);
        Assert.True(service.Create("Ion@Example.com", null, BrokerTypes.Afiliat, 1, Now).Success);
        Assert.False(service.Create("ion@example.com", null, BrokerTypes.Afiliat, 1, Now.AddDays(1)).Success);
        Assert.True(service.Create("ion@example.com", null, BrokerTypes.Afiliat, 1, Now.AddDays(8)).Success);
    }

    [Fact]
    public void Accepting_creates_the_broker_user_and_profile_from_the_invite()
    {
        var (service, db) = Build();
        var token = Invite(service, "ion@example.com", BrokerTypes.MoneyShop);

        var result = service.Accept(token, ValidInput(), "203.0.113.9", Now);

        Assert.True(result.Success, result.Error);
        Assert.Equal("ion-ionescu", result.Slug);
        var user = db.Utilizatoris.Single(u => u.Mail == "ion@example.com");
        Assert.Equal(3, user.IdRol);
        Assert.True(user.EmailVerified);
        Assert.Equal("0722111222", user.NumarTelefon);
        Assert.True(AccountService.VerifyPassword("parola-sigura-1", user.Parola!));
        var profile = db.BrokerProfiles.Single(p => p.UserId == user.IdUtilizator);
        Assert.Equal(BrokerTypes.MoneyShop, profile.Type);
        Assert.Equal("Active", profile.Status);
        Assert.Equal("Ion Ionescu", profile.DisplayName);
        Assert.Equal("Cluj-Napoca", profile.Oras);
        Assert.Equal("Cluj", profile.Judet);
        Assert.Equal("Ionescu Consulting SRL", profile.FirmaNume);
        Assert.Equal("RO1234567", profile.FirmaCui);
        Assert.Equal(BrokerTerms.Version, profile.TermsVersion);
        Assert.Equal(Now, profile.TermsAcceptedAt);
        Assert.Equal("203.0.113.9", profile.TermsAcceptedIp);
        var invite = db.BrokerInvites.Single();
        Assert.Equal(Now, invite.UsedAt);
        Assert.Equal(user.IdUtilizator, invite.UsedByUserId);
    }

    [Fact]
    public void The_accept_input_has_no_email_or_type_so_the_client_cannot_choose_them()
    {
        var names = typeof(BrokerInviteAcceptInput).GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(p => p.Name).ToList();
        Assert.DoesNotContain(names, n => n.Contains("Email", StringComparison.OrdinalIgnoreCase) || n.Contains("Type", StringComparison.OrdinalIgnoreCase) || n.Contains("Rol", StringComparison.OrdinalIgnoreCase));

        var json = System.Text.Json.JsonSerializer.Deserialize<BrokerInviteAcceptInput>(
            """{"nume":"Ionescu","email":"hacker@example.com","type":"MoneyShop","idRol":1,"slug":"x"}""",
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        Assert.Equal("Ionescu", json.Nume);

        var (service, db) = Build();
        var token = Invite(service, "ion@example.com", BrokerTypes.Afiliat);
        Assert.True(service.Accept(token, ValidInput(), null, Now).Success);
        Assert.Null(db.Utilizatoris.FirstOrDefault(u => u.Mail == "hacker@example.com"));
        Assert.Equal(BrokerTypes.Afiliat, db.BrokerProfiles.Single(p => p.Slug == "ion-ionescu").Type);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("a-very-long-address-that-exceeds-the-limit")]
    [InlineData("www")]
    [InlineData("admin")]
    [InlineData("crm")]
    [InlineData("api")]
    [InlineData("ana-popescu")]
    [InlineData("")]
    [InlineData("!!!")]
    public void Bad_or_taken_addresses_are_refused(string slug)
    {
        var (service, db) = Build();
        var token = Invite(service);

        var result = service.Accept(token, ValidInput(slug), null, Now);

        Assert.False(result.Success);
        Assert.NotNull(result.Error);
        Assert.Equal(BrokerInviteError.None, result.InviteError);
        Assert.Equal(1, db.BrokerProfiles.Count());
        Assert.Null(db.BrokerInvites.Single().UsedAt);
        Assert.False(service.CheckSlug(token, slug, Now).Available);
    }

    [Fact]
    public void Addresses_are_normalised_and_checked_live()
    {
        var (service, _) = Build();
        var token = Invite(service);

        var check = service.CheckSlug(token, "  Ion Ionescu ", Now);
        Assert.True(check.Available);
        Assert.Equal("ion-ionescu", check.Slug);
        Assert.Equal(BrokerInviteError.NotFound, service.CheckSlug("nope", "ion", Now).Error);
        Assert.True(service.Accept(token, ValidInput(new string((char)97, 30)), null, Now).Success);
    }

    [Fact]
    public void Password_rules_and_confirmation_are_enforced()
    {
        var (service, db) = Build();
        var token = Invite(service);

        var weak = ValidInput();
        weak.Password = weak.PasswordConfirm = "scurta";
        Assert.False(service.Accept(token, weak, null, Now).Success);

        var mismatch = ValidInput();
        mismatch.PasswordConfirm = "alta-parola-1";
        Assert.False(service.Accept(token, mismatch, null, Now).Success);

        var huge = ValidInput();
        huge.Password = huge.PasswordConfirm = new string('x', 129);
        Assert.False(service.Accept(token, huge, null, Now).Success);

        Assert.Null(db.BrokerInvites.Single().UsedAt);
    }

    [Fact]
    public void The_terms_are_required_and_must_be_the_current_version()
    {
        var (service, db) = Build();
        var token = Invite(service);

        var notAccepted = ValidInput();
        notAccepted.AcceptTerms = false;
        Assert.False(service.Accept(token, notAccepted, null, Now).Success);

        var stale = ValidInput();
        stale.TermsVersion = "2020-01-01";
        Assert.False(service.Accept(token, stale, null, Now).Success);

        var missing = ValidInput();
        missing.TermsVersion = null;
        Assert.False(service.Accept(token, missing, null, Now).Success);

        Assert.Null(db.BrokerInvites.Single().UsedAt);
        Assert.Equal("2026-11-24", BrokerTerms.Version);
    }

    [Fact]
    public void City_county_phone_and_firm_are_validated()
    {
        var (service, db) = Build();
        var token = Invite(service);

        var noCity = ValidInput(); noCity.Oras = "  ";
        var badCounty = ValidInput(); badCounty.Judet = "Atlantida";
        var noCounty = ValidInput(); noCounty.Judet = null;
        var badPhone = ValidInput(); badPhone.Telefon = "123";
        var badCui = ValidInput(); badCui.FirmaCui = "ABC";
        var noNames = ValidInput(); noNames.Nume = " ";

        foreach (var input in new[] { noCity, badCounty, noCounty, badPhone, badCui, noNames })
            Assert.False(service.Accept(token, input, null, Now).Success);

        Assert.Null(db.BrokerInvites.Single().UsedAt);
    }

    [Fact]
    public void The_firm_is_optional_and_the_county_is_stored_in_its_canonical_form()
    {
        var (service, db) = Build();
        var token = Invite(service);
        var input = ValidInput();
        input.FirmaNume = null;
        input.FirmaCui = "  ";
        input.Judet = "bucuresti";

        var result = service.Accept(token, input, null, Now);

        Assert.True(result.Success, result.Error);
        var profile = db.BrokerProfiles.Single(p => p.Slug == "ion-ionescu");
        Assert.Equal("București", profile.Judet);
        Assert.Null(profile.FirmaNume);
        Assert.Null(profile.FirmaCui);
    }

    [Fact]
    public void Accepting_is_refused_when_the_email_became_a_broker_meanwhile()
    {
        var (service, db) = Build();
        var token = Invite(service, "ion@example.com");
        var other = new Utilizatori { Nume = "X", Prenume = "Y", Mail = "ion@example.com", Username = "ion@example.com", IdRol = 3 };
        db.Utilizatoris.Add(other);
        db.SaveChanges();

        var result = service.Accept(token, ValidInput(), null, Now);

        Assert.False(result.Success);
        Assert.Contains("broker", result.Error);
        Assert.Null(db.BrokerInvites.Single().UsedAt);
    }

    [Fact]
    public void A_phone_already_in_use_is_refused()
    {
        var (service, db) = Build();
        var token = Invite(service);
        var input = ValidInput();
        input.Telefon = "0700000001";

        Assert.False(service.Accept(token, input, null, Now).Success);
        Assert.Null(db.BrokerInvites.Single().UsedAt);
    }

    [Fact]
    public void The_list_shows_every_status()
    {
        var (service, _) = Build();
        var pending = service.Create("p@example.com", null, BrokerTypes.Afiliat, 1, Now.AddDays(5));
        var old = service.Create("o@example.com", null, BrokerTypes.Afiliat, 1, Now);
        var revoked = service.Create("r@example.com", null, BrokerTypes.Afiliat, 1, Now.AddDays(5));
        service.Revoke(revoked.Invite!.Id, Now.AddDays(5));
        var used = service.Create("u@example.com", null, BrokerTypes.Afiliat, 1, Now.AddDays(5));
        Assert.True(service.Accept(used.Token!, ValidInput(), null, Now.AddDays(5)).Success);

        var statuses = service.List(Now.AddDays(8)).ToDictionary(i => i.Email, i => i.Status);

        Assert.Equal(BrokerInviteStatuses.Pending, statuses["p@example.com"]);
        Assert.Equal(BrokerInviteStatuses.Expired, statuses["o@example.com"]);
        Assert.Equal(BrokerInviteStatuses.Revoked, statuses["r@example.com"]);
        Assert.Equal(BrokerInviteStatuses.Used, statuses["u@example.com"]);
        Assert.NotNull(pending.Invite);
        Assert.NotNull(old.Invite);
    }

    [Fact]
    public void There_are_forty_two_counties_and_lookups_ignore_case_and_diacritics()
    {
        Assert.Equal(42, RomanianCounties.All.Count);
        Assert.Equal(42, RomanianCounties.All.Distinct().Count());
        Assert.Contains("București", RomanianCounties.All);
        Assert.Equal("Iași", RomanianCounties.Canonical("IASI"));
        Assert.Equal("Bistrița-Năsăud", RomanianCounties.Canonical("bistrita nasaud"));
        Assert.Null(RomanianCounties.Canonical("Narnia"));
        Assert.Null(RomanianCounties.Canonical(null));
    }

    [Fact]
    public void A_broker_edits_their_own_city_and_the_admin_sees_it()
    {
        var (_, db) = Build();
        var profiles = new BrokerProfileService(db, new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build(), NullLogger<BrokerProfileService>.Instance);

        Assert.True(profiles.UpdateOwn(2, new BrokerSelfUpdateInput { Oras = "  Cluj-Napoca  ", Judet = "cluj" }).Success);
        Assert.Equal("Cluj-Napoca", profiles.GetForUser(2)!.Oras);
        Assert.Equal("Cluj", profiles.GetForUser(2)!.Judet);
        var listed = profiles.ListForAdmin().Single();
        Assert.Equal("Cluj-Napoca", listed.Oras);
        Assert.Equal("Cluj", listed.Judet);

        Assert.False(profiles.UpdateOwn(2, new BrokerSelfUpdateInput { Judet = "Narnia" }).Success);
        Assert.True(profiles.UpdateOwn(2, new BrokerSelfUpdateInput { Oras = "", Judet = "" }).Success);
        Assert.Null(profiles.GetForUser(2)!.Oras);
        Assert.Null(profiles.GetForUser(2)!.Judet);
    }
}
