using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.LoggingConfiguration;

public static class SerilogLoggingExtensions
{
    public static IHostBuilder ConfigureSerilogLogging(this IHostBuilder hostBuilder, IConfiguration configuration)
    {
        var logPath = configuration["Logging:LogFilePath"] ?? "Logs/api-log-.txt";

        return hostBuilder.UseSerilog((context, loggerConfig) =>
        {
            loggerConfig
                .ReadFrom.Configuration(context.Configuration)
                .Enrich.FromLogContext()
                .WriteTo.Console()
                .WriteTo.File(logPath, rollingInterval: RollingInterval.Day);
        });
    }
}
