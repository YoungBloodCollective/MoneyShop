-- Codebitori: a client who already signed the acord is linked to another client of the same broker
-- as co-debtor, with the relationship (what the co-debtor is to the client).
--   ClientCoDebtors - one row per link; Relation = Sot | Parinte | Copil | Frate | Ruda | Partener | Altul
--
-- RUN IN PRODUCTION BEFORE DEPLOYING the API that reads this table. Idempotent.

IF OBJECT_ID('dbo.ClientCoDebtors', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientCoDebtors
    (
        Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ClientCoDebtors PRIMARY KEY,
        BrokerProfileId  INT               NOT NULL,
        ClientUserId     INT               NOT NULL,
        CoDebtorUserId   INT               NOT NULL,
        [Relation]       NVARCHAR(30)      NOT NULL,
        CreatedAt        DATETIME2         NOT NULL,
        CreatedByUserId  INT               NULL,
        CONSTRAINT FK_ClientCoDebtors_Broker FOREIGN KEY (BrokerProfileId) REFERENCES dbo.BrokerProfiles (Id),
        CONSTRAINT FK_ClientCoDebtors_Client FOREIGN KEY (ClientUserId) REFERENCES dbo.Utilizatori (IdUtilizator),
        CONSTRAINT FK_ClientCoDebtors_CoDebtor FOREIGN KEY (CoDebtorUserId) REFERENCES dbo.Utilizatori (IdUtilizator),
        CONSTRAINT CK_ClientCoDebtors_NotSelf CHECK (ClientUserId <> CoDebtorUserId)
    );
    PRINT 'ClientCoDebtors created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientCoDebtors_ClientUserId_CoDebtorUserId' AND object_id = OBJECT_ID('dbo.ClientCoDebtors'))
BEGIN
    CREATE UNIQUE INDEX IX_ClientCoDebtors_ClientUserId_CoDebtorUserId ON dbo.ClientCoDebtors (ClientUserId, CoDebtorUserId);
    PRINT 'IX_ClientCoDebtors_ClientUserId_CoDebtorUserId created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientCoDebtors_CoDebtorUserId' AND object_id = OBJECT_ID('dbo.ClientCoDebtors'))
BEGIN
    CREATE INDEX IX_ClientCoDebtors_CoDebtorUserId ON dbo.ClientCoDebtors (CoDebtorUserId);
    PRINT 'IX_ClientCoDebtors_CoDebtorUserId created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientCoDebtors_BrokerProfileId' AND object_id = OBJECT_ID('dbo.ClientCoDebtors'))
BEGIN
    CREATE INDEX IX_ClientCoDebtors_BrokerProfileId ON dbo.ClientCoDebtors (BrokerProfileId);
    PRINT 'IX_ClientCoDebtors_BrokerProfileId created';
END
GO
