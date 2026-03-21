using MoneyShop.DomainModel;
using System;
using System.Collections.Generic;

namespace MoneyShop.DomainModel.Entities;

public partial class Utilizatori : IEntity
{
    public int IdUtilizator { get; set; }

    public string Nume { get; set; } = null!;

    public string Prenume { get; set; } = null!;

    public string? Username { get; set; } = null!;

    public string? Mail { get; set; }

    public string? Parola { get; set; }

    public string? NumarTelefon { get; set; }

    public bool EmailVerified { get; set; } = false;

    public bool PhoneVerified { get; set; } = false;

    public DateTime? DataNastere { get; set; }

    public int IdRol { get; set; }

    public string? FirebaseUid { get; set; }

    public bool? IsDeleted { get; set; }

    // OTP & Session navigation
    public virtual ICollection<OtpChallenge> OtpChallenges { get; set; } = new List<OtpChallenge>();
    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    // KYC navigation
    public virtual ICollection<KycSession> KycSessions { get; set; } = new List<KycSession>();

    // Consents & Mandates navigation
    public virtual ICollection<Consent> Consents { get; set; } = new List<Consent>();
    public virtual ICollection<Mandate> Mandates { get; set; } = new List<Mandate>();
}
