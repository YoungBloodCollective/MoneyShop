using MoneyShop.DomainModel;
﻿
using System;
using System.Collections.Generic;

namespace MoneyShop.DomainModel.Entities;

public partial class Roluri : IEntity
{
    public int IdRol { get; set; }

    public string NumeRol { get; set; } = null!;
}
