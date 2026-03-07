using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddScopedServicesFromAssemblies(this IServiceCollection services, params Assembly[] assemblies)
    {
        foreach (var assembly in assemblies)
        {
            var types = assembly.GetTypes()
                .Where(t => t.IsClass && !t.IsAbstract && !t.IsGenericType)
                .Where(t => !t.Namespace?.Contains(".Dtos") == true)
                .Where(t => !t.Name.EndsWith("Dto") && !t.Name.EndsWith("Request") && !t.Name.EndsWith("Response") && !t.Name.EndsWith("Model"))
                .ToList();

            foreach (var type in types)
            {
                var interfaces = type.GetInterfaces()
                    .Where(i => i != typeof(IDisposable))
                    .ToList();

                foreach (var iface in interfaces)
                {
                    if (iface.Name == $"I{type.Name}")
                    {
                        services.AddScoped(iface, type);
                    }
                }
            }
        }
        return services;
    }
}
