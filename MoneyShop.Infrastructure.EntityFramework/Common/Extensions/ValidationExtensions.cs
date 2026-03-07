using MoneyShop.Infrastructure.EntityFramework.Common.Exceptions;
using FluentValidation.Results;

namespace MoneyShop.Infrastructure.EntityFramework.Common.Extensions;

public static class ValidationExtensions
{
    public static void ThenThrow(this ValidationResult result, object model)
    {
        if (!result.IsValid) throw new ValidationErrorException(result, model);
    }
}
