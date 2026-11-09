using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using System.Text.Json;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Account;
using MoneyShop.ServiceInterface.Dtos.Account;
using MoneyShop.ServiceInterface.SharedDtos;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Consent;
using MoneyShop.DomainServices.RepositoryInterfaces.Mandate;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.Infrastructure.EntityFramework.Common.Extensions;
using MoneyShop.ServiceAdapters.Validations.Account;
using ConsentEntity = MoneyShop.DomainModel.Entities.Consent;
using MandateEntity = MoneyShop.DomainModel.Entities.Mandate;

namespace MoneyShop.ServiceAdapters.Services.Account;

public class AccountService : IAccountService
{
    private readonly IUserRepository _userRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IConsentRepository _consentRepository;
    private readonly IMandateRepository _mandateRepository;
    private readonly MoneyShopDbContext _context;
    private readonly CurrentUserDto _currentUser;
    private readonly UserValidator _userValidator;
    private readonly RegisterUserValidator _registerUserValidator;

    public AccountService(
        IUserRepository userRepository,
        IRoleRepository roleRepository,
        IConsentRepository consentRepository,
        IMandateRepository mandateRepository,
        MoneyShopDbContext context,
        CurrentUserDto currentUser)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _consentRepository = consentRepository;
        _mandateRepository = mandateRepository;
        _context = context;
        _currentUser = currentUser;
        _registerUserValidator = new RegisterUserValidator();
        _userValidator = new UserValidator(_userRepository);
    }

    private const string Pbkdf2Prefix = "PBKDF2-SHA256$";
    private const int Pbkdf2Iterations = 210_000;
    private const int MaxFailedLoginAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public static bool NeedsRehash(string stored) => stored == null || !stored.StartsWith(Pbkdf2Prefix, StringComparison.Ordinal);

    public static bool VerifyPassword(string enteredPassword, string hashedPassword)
    {
        if (enteredPassword == null || hashedPassword == null)
        {
            return false;
        }

        if (hashedPassword.StartsWith(Pbkdf2Prefix, StringComparison.Ordinal))
        {
            var parts = hashedPassword.Split('$');
            if (parts.Length != 4 || !int.TryParse(parts[1], out var iterations) || iterations <= 0)
            {
                return false;
            }
            try
            {
                var salt = Convert.FromBase64String(parts[2]);
                var expected = Convert.FromBase64String(parts[3]);
                var actual = Rfc2898DeriveBytes.Pbkdf2(enteredPassword, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
                return CryptographicOperations.FixedTimeEquals(actual, expected);
            }
            catch (FormatException)
            {
                return false;
            }
        }

        var legacy = Encoding.UTF8.GetBytes(Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(enteredPassword))));
        return CryptographicOperations.FixedTimeEquals(legacy, Encoding.UTF8.GetBytes(hashedPassword));
    }

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Pbkdf2Iterations, HashAlgorithmName.SHA256, 32);
        return $"{Pbkdf2Prefix}{Pbkdf2Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public CurrentUserDto Login(string email, string password)
    {
        UserRoles users = new UserRoles();
        Dictionary<int, string> userRoles = users.CreateUserRolesDictionary();
        var user = _userRepository.Get()
            .FirstOrDefault(u => u.Mail == email && u.IsDeleted != true);

        if (user == null)
        {
            return new CurrentUserDto { IsAuthenticated = false };
        }

        if (user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value > DateTime.UtcNow)
        {
            throw new AccountLockedException(user.LockoutEndUtc.Value);
        }

        var storedHashedPassword = user.Parola;
        bool isAuthenticated = VerifyPassword(password, storedHashedPassword);

        if (isAuthenticated)
        {
            if (NeedsRehash(user.Parola) || user.FailedLoginAttempts != 0 || user.LockoutEndUtc.HasValue)
            {
                if (NeedsRehash(user.Parola))
                {
                    user.Parola = HashPassword(password);
                }
                user.FailedLoginAttempts = 0;
                user.LockoutEndUtc = null;
                _userRepository.Update(user);
                _context.SaveChanges();
            }

            // Safely get role, default to "Utilizator" if role not found
            string role = userRoles.ContainsKey(user.IdRol) ? userRoles[user.IdRol] : "Utilizator";

            return new CurrentUserDto
            {
                Id = user.IdUtilizator,
                Email = user.Mail,
                FirstName = user.Nume + " " + user.Prenume,
                IsAuthenticated = true,
                Role = role
            };
        }

        user.FailedLoginAttempts++;
        if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
        {
            user.LockoutEndUtc = DateTime.UtcNow.Add(LockoutDuration);
            user.FailedLoginAttempts = 0;
        }
        _userRepository.Update(user);
        _context.SaveChanges();
        return new CurrentUserDto { IsAuthenticated = false };
    }

    public void RegisterNewUser(RegisterModel model)
    {
        _registerUserValidator.Validate(model).ThenThrow(model);

        // Check if user with this email already exists
        var existingUser = _userRepository.Get().FirstOrDefault(u => u.Mail == model.Email);
        if (existingUser != null)
        {
            throw new Exception("Un cont cu acest email există deja.");
        }

        var user = ToUtilizatori(model);
        user.Mail = model.Email;
        user.NumarTelefon = model.Phone;
        user.Username = model.Email;
        user.Parola = HashPassword(user.Parola);

        // Set default role to 1 (Utilizator) if Role is 0 or not provided
        // First, verify that role 1 exists in the database
        var roleExists = _roleRepository.Get().Any(r => r.IdRol == 1);
        if (!roleExists)
        {
            // If role 1 doesn't exist, try to find the first available role
            var firstRole = _roleRepository.Get().OrderBy(r => r.IdRol).FirstOrDefault();
            if (firstRole != null)
            {
                user.IdRol = firstRole.IdRol;
            }
            else
            {
                throw new Exception("No roles found in database. Please run PopulateRoles.sql script first.");
            }
        }
        else
        {
            user.IdRol = 1;
        }

        user.IsDeleted = false;

        _userRepository.Insert(user);
        _context.SaveChanges();

        // Save consents and mandates
        SaveUserConsentsAndMandates(user.IdUtilizator, model);
    }

    private void SaveUserConsentsAndMandates(int userId, RegisterModel model)
    {
        var now = DateTime.UtcNow;
        var sourceChannel = "web";
        var deviceHashBytes = !string.IsNullOrEmpty(model.DeviceHash)
            ? Encoding.UTF8.GetBytes(model.DeviceHash)
            : null;

        // 1. Terms & Conditions consent
        if (model.AcceptTerms)
        {
            var termsConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "TC_ACCEPT",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Accept Termenii și Condițiile de utilizare a platformei MoneyShop.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(termsConsent);
        }

        // 2. GDPR consent
        if (model.AcceptGdpr)
        {
            var gdprConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "GDPR_ACCEPT",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Am citit și înțeleg cum sunt prelucrate datele mele personale conform GDPR.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(gdprConsent);
        }

        // 3. Costs consent
        if (model.AcceptCosts)
        {
            var costsConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "COSTS_ACCEPT",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Confirm că am luat la cunoștință că serviciile MoneyShop sunt gratuite pentru utilizatori.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(costsConsent);
        }

        // 4. ANAF Mandate
        if (model.MandateAnaf)
        {
            var anafMandate = new MandateEntity
            {
                MandateId = Guid.NewGuid(),
                UserId = userId,
                MandateType = "ANAF",
                Scope = "credit_eligibility_only",
                Status = "active",
                GrantedAt = now,
                ExpiresAt = now.AddDays(30)
            };
            _mandateRepository.Insert(anafMandate);

            // Also create the consent record for audit
            var anafConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "MANDATE_ANAF",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Împuternicesc MoneyShop să interogheze ANAF pentru verificarea veniturilor mele în scopul determinării eligibilității pentru credite. Valabilitate: 30 de zile.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(anafConsent);
        }

        // 5. Birou Credit Mandate (optional)
        if (model.MandateBiroCredit)
        {
            var bcMandate = new MandateEntity
            {
                MandateId = Guid.NewGuid(),
                UserId = userId,
                MandateType = "BC",
                Scope = "credit_eligibility_only",
                Status = "active",
                GrantedAt = now,
                ExpiresAt = now.AddDays(30)
            };
            _mandateRepository.Insert(bcMandate);

            // Also create the consent record for audit
            var bcConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "MANDATE_BC",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Împuternicesc MoneyShop să interogheze Biroul de Credit pentru o analiză completă a eligibilității mele. Valabilitate: 30 de zile.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(bcConsent);
        }

        // 6. Share to Broker (optional, default OFF)
        if (model.ShareToBroker)
        {
            var brokerConsent = new ConsentEntity
            {
                ConsentId = Guid.NewGuid(),
                UserId = userId,
                ConsentType = "SHARE_TO_BROKER",
                Status = "granted",
                GrantedAt = now,
                ConsentTextSnapshot = "Accept ca datele mele să fie transmise brokerilor parteneri MoneyShop pentru a primi oferte personalizate.",
                Ip = model.IpAddress,
                UserAgent = model.UserAgent,
                DeviceHash = deviceHashBytes,
                SourceChannel = sourceChannel
            };
            _consentRepository.Insert(brokerConsent);
        }

        _context.SaveChanges();
    }

    public List<ListItemModel<string, int>> GetUsers()
    {
        return _userRepository.Get()
            .Select(u => new ListItemModel<string, int>
            {
                Text = $"{u.Nume} {u.Prenume}",
                Value = u.IdUtilizator
            })
            .ToList();
    }

    public bool SendMailResetPassword(string email)
    {
        string emailSubject = "Reset Password";
        var randomString = GenerateRandomString(8);
        string emailBody = $"Your reset code is {randomString}. It is available for only 1 hour so hurry up!";

        var user = _userRepository.Get().Where(u => u.Mail == email).FirstOrDefault();
        _context.SaveChanges();
        return true;
    }

    private static Utilizatori ToUtilizatori(RegisterModel model) => new()
    {
        Parola = model.Password,
        Prenume = model.LastName,
        Nume = model.FirstName,
        Mail = model.Email
    };

    private static UserModelEdit ToUserModelEdit(Utilizatori user) => new()
    {
        Id = user.IdUtilizator,
        BirthDay = user.DataNastere ?? default,
        Email = user.Mail,
        FirstName = user.Nume,
        LastName = user.Prenume
    };

    public UserModelEdit GetUserById()
    {
        UserRoles usersList = new UserRoles();
        Dictionary<int, string> userRoles = usersList.CreateUserRolesDictionary();
        var user = _userRepository.Get().Where(u => u.IdUtilizator == _currentUser.Id).FirstOrDefault();
        var userModelEdit = ToUserModelEdit(user);
        userModelEdit.Roles = userRoles;
        return userModelEdit;
    }

    public CurrentUserDto UpdateUser(UserModelEdit model)
    {
        _userValidator.Validate(model).ThenThrow(model);

        UserRoles usersList = new UserRoles();
        Dictionary<int, string> userRoles = usersList.CreateUserRolesDictionary();
        var user = _userRepository.Get().Where(u => u.IdUtilizator == _currentUser.Id).FirstOrDefault();
        user.DataNastere = model.BirthDay;
        user.Nume = model.FirstName;
        user.Prenume = model.LastName;
        _userRepository.Update(user);
        _context.SaveChanges();
        // Safely get role, default to "Utilizator" if role not found
        string role = userRoles.ContainsKey(user.IdRol) ? userRoles[user.IdRol] : "Utilizator";

        return new CurrentUserDto()
        {
            Email = user.Mail,
            Id = user.IdUtilizator,
            FirstName = user.Nume,
            LastName = user.Prenume,
            IsAuthenticated = true,
            Role = role
        };
    }

    public CurrentUserDto SocialLogin(string firebaseUid, string email, string name, bool emailVerified = false)
    {
        var userRoles = new UserRoles();
        var rolesDict = userRoles.CreateUserRolesDictionary();
        var user = _userRepository.Get().FirstOrDefault(u => u.FirebaseUid == firebaseUid);
        if (user == null)
        {
            user = _userRepository.Get().FirstOrDefault(u => u.Mail == email && u.IsDeleted != true);
            if (user != null && !emailVerified)
                throw new InvalidOperationException("Adresa de e-mail nu este verificată la furnizorul de autentificare.");
            if (user != null && user.IdRol != 1)
                throw new InvalidOperationException("Pentru acest cont foloseste autentificarea cu email si parola.");
            if (user != null)
            {
                user.FirebaseUid = firebaseUid;
                _userRepository.Update(user);
                _context.SaveChanges();
            }
        }
        if (user == null)
        {
            var nameParts = (name ?? email ?? "").Split(' ', 2);
            var firstName = nameParts.Length > 0 ? nameParts[0] : "";
            var lastName = nameParts.Length > 1 ? nameParts[1] : "";
            user = new Utilizatori
            {
                Nume = firstName,
                Prenume = lastName,
                Mail = email,
                Username = email,
                FirebaseUid = firebaseUid,
                EmailVerified = emailVerified,
                PhoneVerified = false,
                IdRol = 1,
                IsDeleted = false
            };
            _userRepository.Insert(user);
            _context.SaveChanges();
        }
        string role = rolesDict.ContainsKey(user.IdRol) ? rolesDict[user.IdRol] : "Utilizator";
        return new CurrentUserDto
        {
            Id = user.IdUtilizator,
            Email = user.Mail,
            FirstName = user.Nume + " " + user.Prenume,
            IsAuthenticated = true,
            Role = role
        };
    }

    static string GenerateRandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        Random random = new Random();
        return new string(Enumerable.Repeat(chars, length)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

}
