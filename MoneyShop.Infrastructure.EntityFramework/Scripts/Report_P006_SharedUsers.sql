-- P0-06 report. SELECTs only, writes nothing. Lists client users that carry broker-owned
-- records from more than one broker, or from a broker plus unassigned (NULL) records: the
-- rows where an old public acord may have been attached to someone else's client.
-- Use it to decide remediation; run it before and after Migration_AddAcordSubjectId.sql.

;WITH Owned AS (
    SELECT UserId, BrokerProfileId, 'AcordClients' AS Src FROM dbo.AcordClients
    UNION ALL SELECT UserId, BrokerProfileId, 'Applications' FROM dbo.Applications
    UNION ALL SELECT UserId, BrokerProfileId, 'BankFiles' FROM dbo.BankFiles
),
Shared AS (
    SELECT UserId
    FROM Owned
    GROUP BY UserId
    HAVING COUNT(DISTINCT ISNULL(BrokerProfileId, -1)) > 1
)
SELECT COUNT(*) AS SharedUsers FROM Shared;
GO

;WITH Owned AS (
    SELECT UserId, BrokerProfileId, 'AcordClients' AS Src FROM dbo.AcordClients
    UNION ALL SELECT UserId, BrokerProfileId, 'Applications' FROM dbo.Applications
    UNION ALL SELECT UserId, BrokerProfileId, 'BankFiles' FROM dbo.BankFiles
),
Shared AS (
    SELECT UserId
    FROM Owned
    GROUP BY UserId
    HAVING COUNT(DISTINCT ISNULL(BrokerProfileId, -1)) > 1
)
SELECT o.UserId,
       COUNT(DISTINCT ISNULL(o.BrokerProfileId, -1)) AS Owners,
       SUM(CASE WHEN o.Src = 'AcordClients' THEN 1 ELSE 0 END) AS Acords,
       SUM(CASE WHEN o.Src = 'Applications' THEN 1 ELSE 0 END) AS Applications,
       SUM(CASE WHEN o.Src = 'BankFiles' THEN 1 ELSE 0 END) AS BankFiles,
       MAX(CASE WHEN o.BrokerProfileId IS NULL THEN 1 ELSE 0 END) AS HasUnassigned
FROM Owned o
WHERE o.UserId IN (SELECT UserId FROM Shared)
GROUP BY o.UserId
ORDER BY o.UserId;
GO

;WITH Owned AS (
    SELECT UserId, BrokerProfileId FROM dbo.AcordClients
    UNION ALL SELECT UserId, BrokerProfileId FROM dbo.Applications
    UNION ALL SELECT UserId, BrokerProfileId FROM dbo.BankFiles
),
Shared AS (
    SELECT UserId
    FROM Owned
    GROUP BY UserId
    HAVING COUNT(DISTINCT ISNULL(BrokerProfileId, -1)) > 1
)
SELECT a.UserId, a.BrokerProfileId, a.AcordId, a.Telefon, a.Status, a.CreatedAt, a.SubjectId
FROM dbo.AcordClients a
WHERE a.UserId IN (SELECT UserId FROM Shared)
ORDER BY a.UserId, a.CreatedAt;
GO
