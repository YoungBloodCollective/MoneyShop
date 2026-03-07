using System;
using System.Collections.Generic;

namespace MoneyShop.DomainModel.Entities
{
    public class FaqItem : IEntity
    {
        public int Id { get; set; }
        public string Question { get; set; } = null!;
        public string Answer { get; set; } = null!;
        public string? AliasesJson { get; set; } // JSON array de string-uri
        public string? TagsJson { get; set; } // JSON array de string-uri
        public int Priority { get; set; } = 0;
        public bool Enabled { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

