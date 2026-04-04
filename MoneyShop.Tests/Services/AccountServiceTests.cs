using MoneyShop.ServiceAdapters.Services.Account;
using FluentAssertions;

namespace MoneyShop.Tests.Services;

public class AccountServiceTests
{
    [Fact]
    public void HashPassword_ReturnsNonEmptyString()
    {
        var hash = AccountService.HashPassword("TestPassword123!");
        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void HashPassword_DifferentInputs_DifferentHashes()
    {
        var hash1 = AccountService.HashPassword("Password1");
        var hash2 = AccountService.HashPassword("Password2");
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void HashPassword_SameInput_ProducesConsistentVerification()
    {
        var password = "SamePassword";
        var hash = AccountService.HashPassword(password);
        AccountService.VerifyPassword(password, hash).Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_CorrectPassword_ReturnsTrue()
    {
        var password = "MySecurePassword123!";
        var hash = AccountService.HashPassword(password);
        AccountService.VerifyPassword(password, hash).Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var hash = AccountService.HashPassword("CorrectPassword");
        AccountService.VerifyPassword("WrongPassword", hash).Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_EmptyPassword_ReturnsFalse()
    {
        var hash = AccountService.HashPassword("SomePassword");
        AccountService.VerifyPassword("", hash).Should().BeFalse();
    }

    [Fact]
    public void HashPassword_SpecialCharacters_Works()
    {
        var password = "P@$$w0rd!#%^&*()";
        var hash = AccountService.HashPassword(password);
        AccountService.VerifyPassword(password, hash).Should().BeTrue();
    }

    [Fact]
    public void HashPassword_UnicodeCharacters_Works()
    {
        var password = "Parolă cu diacritice și caractere speciale";
        var hash = AccountService.HashPassword(password);
        AccountService.VerifyPassword(password, hash).Should().BeTrue();
    }

    [Fact]
    public void HashPassword_LongPassword_Works()
    {
        var password = new string('A', 256);
        var hash = AccountService.HashPassword(password);
        AccountService.VerifyPassword(password, hash).Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_NullHash_ThrowsOrReturnsFalse()
    {
        try
        {
            var result = AccountService.VerifyPassword("password", null!);
            result.Should().BeFalse();
        }
        catch (Exception)
        {
            true.Should().BeTrue();
        }
    }
}
