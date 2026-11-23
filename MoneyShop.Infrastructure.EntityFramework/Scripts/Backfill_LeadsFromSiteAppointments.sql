-- One-off: every booking that came from the site (Source 'site', or NULL from before bookings
-- were tagged) becomes a lead, like new bookings do since #113. One lead per broker and phone
-- (last 9 digits), from that phone's most recent booking; phones that already have a lead
-- are skipped, so re-running inserts nothing new.
-- Status from the booking: Nou -> Nou; Anulat / Nu se incadreaza -> Necalificat;
-- Finalizat -> Convertit; every other status -> Contactat.
-- Rollback: rows with Source = 'appointment' and the UpdatedAt printed at the end.

SET NOCOUNT ON;
DECLARE @now DATETIME2 = SYSUTCDATETIME();

;WITH Appts AS (
    SELECT a.*,
           RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(a.Telefon, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', ''), 9) AS Phone9,
           ROW_NUMBER() OVER (
               PARTITION BY a.BrokerProfileId,
                            RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(a.Telefon, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', ''), 9)
               ORDER BY a.CreatedAt DESC) AS rn
    FROM dbo.Appointments a
    WHERE ISNULL(a.Source, 'site') = 'site' AND a.Telefon IS NOT NULL AND LEN(a.Telefon) >= 9
)
INSERT INTO dbo.LeadCaptures
    (BrokerProfileId, NumePrenume, Telefon, Email, Oras, CrediteActive, Intarzieri, IntarzieriZileMax,
     VenitNetLunar, PoprireSauExecutorUltimii5Ani, Source, AdminNotes, Status, ContactedAt, CreatedAt, UpdatedAt)
SELECT a.BrokerProfileId,
       LEFT(LTRIM(RTRIM(ISNULL(a.Nume, '') + ' ' + ISNULL(a.Prenume, ''))), 120),
       LEFT(a.Telefon, 20),
       LEFT(ISNULL(a.Email, ''), 200),
       LEFT(ISNULL(a.Judet, ''), 80),
       0,
       CASE WHEN a.IntarzieriBirou IS NULL OR a.IntarzieriBirou = 'NU' THEN 0 ELSE 1 END,
       CASE a.IntarzieriBirou WHEN 'Da-30 zile' THEN 30 WHEN 'Da-60 zile' THEN 60 WHEN 'Da-Peste 90 zile' THEN 90 ELSE NULL END,
       a.SalariuNet,
       CASE WHEN a.PopriRecuperare = 'DA' THEN 1 ELSE 0 END,
       'appointment',
       LEFT(a.Notes, 1000),
       CASE WHEN a.Status = 'Nou' THEN 'Nou'
            WHEN a.Status IN ('Anulat', 'Nu se incadreaza') THEN 'Necalificat'
            WHEN a.Status = 'Finalizat' THEN 'Convertit'
            ELSE 'Contactat' END,
       CASE WHEN a.Status = 'Nou' THEN NULL ELSE a.UpdatedAt END,
       a.CreatedAt,
       @now
FROM Appts a
WHERE a.rn = 1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.LeadCaptures l
      WHERE ISNULL(l.BrokerProfileId, -1) = ISNULL(a.BrokerProfileId, -1)
        AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(l.Telefon, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', ''), 9) = a.Phone9);

SELECT @@ROWCOUNT AS leads_inserted, @now AS rollback_marker_updated_at;
