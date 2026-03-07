using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MoneyShop.Infrastructure.EntityFramework.Common.Extensions;

public class DateOnlyConverter : ValueConverter<DateOnly, DateTime>
{
    public DateOnlyConverter() : base(d => d.ToDateTime(TimeOnly.MinValue), d => DateOnly.FromDateTime(d))
    {
    }
}
