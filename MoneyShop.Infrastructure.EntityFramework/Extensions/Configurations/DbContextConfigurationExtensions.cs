using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.Configurations;

public static class DbContextConfigurationExtensions
{
    public static IServiceCollection ConfigureDatabaseContexts(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<MoneyShopDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.CommandTimeout(120)));
        return services;
    }
}
