namespace MoneyShop.ServiceInterface.Interfaces.OpenAIPlugin
{
    public interface IAzureOpenAIPluginService
    {
        PluginInfo GetPluginInfo();
        Task<PluginResponse> ProcessPromptAsync(string prompt);
    }

    public class PluginInfo
    {
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public string Version { get; set; } = "";
    }

    public class PluginResponse
    {
        public string Result { get; set; } = "";
        public string Model { get; set; } = "";
        public bool Success { get; set; }
    }
}
