using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.DependencyInjection;

public static class DependencyInjectionConfig
{
    public static IServiceCollection ConfigureServices(this IServiceCollection services)
    {
        services.AddScopedServicesFromAssemblies(
            Assembly.GetExecutingAssembly(),
            Assembly.Load("MoneyShop.ServiceInterface"),
            Assembly.Load("MoneyShop.ServiceAdapters"),
            Assembly.Load("MoneyShop.DomainServices"),
            Assembly.Load("MoneyShop.Infrastructure.EntityFramework")
        );
        return services;
    }
}
