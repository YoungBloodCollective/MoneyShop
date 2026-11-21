using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Account;
using MoneyShop.ServiceInterface.Interfaces.Account;

namespace MoneyShop.Tests.Account;

public class PasswordResetServiceTests
{
    private static readonly DateTime Now = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);

    private static (PasswordResetService Service, MoneyShopDbContext Db, Utilizatori User) Build(string? key = null)
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var user = new Utilizatori
        {
            IdUtilizator = 7, Nume = "Ana", Prenume = "Popescu", Mail = "ana@example.com",
            Parola = AccountService.HashPassword("parola-veche"), FailedLoginAttempts = 5, LockoutEndUtc = Now.AddMinutes(10),
        };
        db.Utilizatoris.Add(user);
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 8, Nume = "Sters", Prenume = "X", Mail = "sters@example.com", IsDeleted = true });
        db.SaveChanges();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["JwtSettings:SecretKey"] = key ?? new string('k', 40) })
            .Build();
        return (new PasswordResetService(db, config), db, user);
    }

    [Fact]
    public void Unknown_or_deleted_emails_get_no_link()
    {
        var (service, _, _) = Build();
        Assert.Null(service.CreateRequest("nimeni@example.com", Now));
        Assert.Null(service.CreateRequest("sters@example.com", Now));
        Assert.Null(service.CreateRequest("  ", Now));
    }

    [Fact]
    public void A_link_sets_the_new_password_once_and_clears_the_lockout()
    {
        var (service, db, user) = Build();
        var request = service.CreateRequest(" ana@example.com ", Now)!;
        Assert.Equal(7, request.UserId);
        Assert.Equal(PasswordResetError.None, service.Validate(request.Token, Now.AddMinutes(5)));

        Assert.Equal(PasswordResetError.None, service.Reset(request.Token, "parola-noua-123", Now.AddMinutes(5)));

        var saved = db.Utilizatoris.Find(7)!;
        Assert.True(AccountService.VerifyPassword("parola-noua-123", saved.Parola!));
        Assert.Equal(0, saved.FailedLoginAttempts);
        Assert.Null(saved.LockoutEndUtc);
        Assert.True(saved.EmailVerified);
        // The password changed, so the same link no longer works.
        Assert.Equal(PasswordResetError.InvalidLink, service.Reset(request.Token, "alta-parola-456", Now.AddMinutes(6)));
    }

    [Fact]
    public void Links_expire_after_an_hour()
    {
        var (service, _, _) = Build();
        var token = service.CreateRequest("ana@example.com", Now)!.Token;
        Assert.Equal(PasswordResetError.Expired, service.Validate(token, Now.Add(IPasswordResetService.LinkLifetime).AddSeconds(1)));
        Assert.Equal(PasswordResetError.Expired, service.Reset(token, "parola-noua-123", Now.AddHours(2)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("nu-e-token")]
    [InlineData("7.9999999999.abc")]
    [InlineData("8.9999999999.abc")]
    public void Tampered_links_are_refused(string token)
    {
        var (service, _, _) = Build();
        Assert.Equal(PasswordResetError.InvalidLink, service.Validate(token, Now));
    }

    [Fact]
    public void A_link_cannot_be_moved_to_another_user_or_signed_with_another_key()
    {
        var (service, _, _) = Build();
        var token = service.CreateRequest("ana@example.com", Now)!.Token;
        var parts = token.Split('.');
        Assert.Equal(PasswordResetError.InvalidLink, service.Validate($"8.{parts[1]}.{parts[2]}", Now));
        Assert.Equal(PasswordResetError.InvalidLink, service.Validate($"7.{long.Parse(parts[1]) + 3600}.{parts[2]}", Now));
        Assert.Equal(PasswordResetError.InvalidLink, Build(new string('z', 40)).Service.Validate(token, Now));
    }

    [Fact]
    public void Short_passwords_are_refused_and_the_link_still_works()
    {
        var (service, _, _) = Build();
        var token = service.CreateRequest("ana@example.com", Now)!.Token;
        Assert.Equal(PasswordResetError.WeakPassword, service.Reset(token, "scurt", Now));
        Assert.Equal(PasswordResetError.None, service.Validate(token, Now));
    }
}
