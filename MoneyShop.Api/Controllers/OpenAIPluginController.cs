using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.OpenAIPlugin;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/openai-plugin")]
    public class OpenAIPluginController : BaseController
    {
        private readonly IAzureOpenAIPluginService _pluginService;
        private readonly ILogger<OpenAIPluginController> _logger;

        public OpenAIPluginController(
            IAzureOpenAIPluginService pluginService,
            ILogger<OpenAIPluginController> logger)
        {
            _pluginService = pluginService;
            _logger = logger;
        }

        [HttpGet("info")]
        [ProducesResponseType(typeof(PluginInfo), 200)]
        public IActionResult GetInfo()
        {
            try
            {
                var info = _pluginService.GetPluginInfo();
                return Ok(info);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting plugin info");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        [HttpPost("prompt")]
        [ProducesResponseType(typeof(PluginResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> ProcessPrompt([FromBody] PromptRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Prompt))
            {
                _logger.LogWarning("Invalid or empty prompt received");
                return BadRequest(new
                {
                    error = "Invalid request",
                    message = "Prompt cannot be empty or null. Please provide a valid prompt in the request body."
                });
            }

            try
            {
                var response = await _pluginService.ProcessPromptAsync(request.Prompt);
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument in prompt request");
                return BadRequest(new { error = "Invalid request", message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Configuration or operation error");
                return StatusCode(500, new { error = "Configuration error", message = ex.Message });
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Azure OpenAI request failure");
                return StatusCode(502, new
                {
                    error = "Azure OpenAI request failed",
                    message = "Failed to communicate with Azure OpenAI service. Please check the configuration and try again."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal server error processing prompt");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    message = "An unexpected error occurred while processing your request."
                });
            }
        }
    }

    public class PromptRequest
    {
        public string Prompt { get; set; } = "";
    }
}
