using System.ComponentModel.DataAnnotations;

namespace MoneyShop.ServiceInterface.Dtos.Account
{
    public class RegisterModel
    {
        [Required(ErrorMessage = "Email-ul este obligatoriu")]
        [EmailAddress(ErrorMessage = "Adresa de email nu este valida")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Parola este obligatorie")]
        [MinLength(8, ErrorMessage = "Parola trebuie sa aiba minim 8 caractere")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Confirmarea parolei este obligatorie")]
        [Compare("Password", ErrorMessage = "Parolele nu coincid")]
        public string ConfirmPassword { get; set; }

        [Required(ErrorMessage = "Prenumele este obligatoriu")]
        public string FirstName { get; set; }

        [Required(ErrorMessage = "Numele este obligatoriu")]
        public string LastName { get; set; }

        [Phone(ErrorMessage = "Numarul de telefon nu este valid")]
        public string Phone { get; set; }

        public int Role { get; set; } = 1;

        // Consents
        [Required]
        [Range(typeof(bool), "true", "true", ErrorMessage = "Trebuie sa accepti Termenii si Conditiile")]
        public bool AcceptTerms { get; set; }

        [Required]
        [Range(typeof(bool), "true", "true", ErrorMessage = "Trebuie sa accepti Politica GDPR")]
        public bool AcceptGdpr { get; set; }

        [Required]
        [Range(typeof(bool), "true", "true", ErrorMessage = "Trebuie sa accepti informatiile despre costuri")]
        public bool AcceptCosts { get; set; }

        // Mandates
        [Required]
        [Range(typeof(bool), "true", "true", ErrorMessage = "Mandatul ANAF este necesar")]
        public bool MandateAnaf { get; set; }

        public bool MandateBiroCredit { get; set; }
        public bool ShareToBroker { get; set; }

        // Audit metadata (auto-populated server-side if empty)
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string? DeviceHash { get; set; }
        public DateTime ConsentTimestamp { get; set; } = DateTime.UtcNow;
    }
}
