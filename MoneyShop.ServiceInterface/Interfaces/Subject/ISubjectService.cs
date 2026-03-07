namespace MoneyShop.ServiceInterface.Interfaces.Subject
{
    public interface ISubjectService
    {
        SubjectMapResult GetOrCreateSubject(int userId, string cnp);
        SubjectMapResult? GetSubjectByUserId(int userId);
        SubjectMapResult? GetSubjectById(string subjectId);
    }

    public class SubjectMapResult
    {
        public string SubjectId { get; set; } = null!;
        public byte[] CnpHash { get; set; } = null!;
        public string? CnpLast4 { get; set; }
        public string CnpMasked { get; set; } = null!;
        public bool IsNew { get; set; }
    }
}
