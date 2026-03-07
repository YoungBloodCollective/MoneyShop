using MoneyShop.ServiceInterface.Dtos.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using FluentValidation;

namespace MoneyShop.ServiceAdapters.Validations.Account;

public class UserValidator : AbstractValidator<UserModelEdit>
{
    private readonly IUserRepository _userRepository;

    public UserValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;
        RuleFor(r => r.FirstName)
            .NotEmpty().WithMessage("Camp obligatoriu!")
            .Length(3, 20).WithMessage("First Name must have atleast 3 letters and max 20 letters");
        RuleFor(r => r.LastName)
            .NotEmpty().WithMessage("Camp obligatoriu!")
            .Length(3, 20).WithMessage("Last Name must have atleast 3 letters and max 20 letters");
    }

    private bool BeAtLeastThirdteenYearsAgo(DateTime birthDay)
    {
        var today = DateTime.Today;
        var age = today.Year - birthDay.Year;

        if (birthDay > today.AddYears(-age))
        {
            age--;
        }

        return age >= 16;
    }
}
