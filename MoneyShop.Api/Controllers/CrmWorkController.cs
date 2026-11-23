using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    /// <summary>
    /// The broker's follow-up on a client, from the client page: tasks with a reminder, files
    /// submitted to banks (with the bank's stages) and labels. All in the broker's own scope.
    /// </summary>
    [ApiController]
    [Route("api/crm")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmWorkController : BaseController
    {
        private const string NotVisible = "Clientul nu există sau nu îți este atribuit.";

        private readonly ICrmWorkService _work;
        private readonly ICrmService _crm;

        public CrmWorkController(ICrmWorkService work, ICrmService crm)
        {
            _work = work;
            _crm = crm;
        }

        [HttpGet("clients/{userId:int}/work")]
        public IActionResult GetClientWork(int userId)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound(NotVisible);
            return Ok(_work.GetClientWork(userId));
        }

        [HttpGet("work-board")]
        public IActionResult GetBoard() => Ok(_work.GetBoard());

        public class TaskInput
        {
            public string? Title { get; set; }
            public DateTime? DueAt { get; set; }
        }

        [HttpPost("clients/{userId:int}/tasks")]
        public IActionResult AddTask(int userId, [FromBody] TaskInput input)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound(NotVisible);
            if (string.IsNullOrWhiteSpace(input.Title)) return BadRequest("Scrie ce ai de făcut.");
            if (input.DueAt == null) return BadRequest("Alege data și ora reminderului.");
            var due = input.DueAt.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(input.DueAt.Value, DateTimeKind.Utc)
                : input.DueAt.Value.ToUniversalTime();
            if (due < DateTime.UtcNow.AddYears(-1) || due > DateTime.UtcNow.AddYears(2))
                return BadRequest("Data reminderului nu este validă.");
            return Ok(_work.AddTask(userId, input.Title, due), "Task adăugat");
        }

        public class TaskDoneInput
        {
            public bool Done { get; set; }
        }

        [HttpPut("tasks/{taskId:int}/done")]
        public IActionResult SetTaskDone(int taskId, [FromBody] TaskDoneInput input)
        {
            var task = _work.SetTaskDone(taskId, input.Done);
            return task == null ? NotFound("Taskul nu există.") : Ok(task);
        }

        [HttpDelete("tasks/{taskId:int}")]
        public IActionResult DeleteTask(int taskId) =>
            _work.DeleteTask(taskId) ? Ok(new { deleted = true }, "Task șters") : NotFound("Taskul nu există.");

        [HttpPost("clients/{userId:int}/bank-files")]
        public IActionResult AddBankFile(int userId, [FromBody] CrmBankFileInput input)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound(NotVisible);
            var error = Validate(input);
            if (error != null) return BadRequest(error);
            try { return Ok(_work.AddBankFile(userId, input), "Dosar bancar adăugat"); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("bank-files/{bankFileId:int}")]
        public IActionResult UpdateBankFile(int bankFileId, [FromBody] CrmBankFileInput input)
        {
            var error = Validate(input);
            if (error != null) return BadRequest(error);
            CrmBankFileItem? file;
            try { file = _work.UpdateBankFile(bankFileId, input); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
            return file == null ? NotFound("Dosarul bancar nu există.") : Ok(file, "Dosar bancar actualizat");
        }

        [HttpDelete("bank-files/{bankFileId:int}")]
        public IActionResult DeleteBankFile(int bankFileId) =>
            _work.DeleteBankFile(bankFileId) ? Ok(new { deleted = true }, "Dosar bancar șters") : NotFound("Dosarul bancar nu există.");

        public class TagsInput
        {
            public List<string> Tags { get; set; } = new();
        }

        [HttpPut("clients/{userId:int}/tags")]
        public IActionResult SetTags(int userId, [FromBody] TagsInput input)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound(NotVisible);
            return Ok(_work.SetTags(userId, input.Tags ?? new List<string>()));
        }

        private static string? Validate(CrmBankFileInput input)
        {
            if (input.BankId is not > 0) return "Alege banca.";
            if (!CreditTypes.IsValid(input.CreditType)) return "Alege tipul de credit.";
            if (input.Amount <= 0 || input.Amount > 100_000_000) return "Suma trebuie să fie mai mare decât 0.";
            if (!BankFileStatuses.IsValid(input.Status)) return "Starea dosarului nu este validă.";
            return null;
        }
    }
}
