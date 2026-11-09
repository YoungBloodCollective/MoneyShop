-- KycSessions.Cnp used to hold the full plaintext CNP. The API now stores only the masked
-- form; this masks what is already there.
--
-- Run AFTER deploying the API (or before - both orders are safe). Irreversible by design.
-- Idempotent: already-masked values contain '*' and are skipped.

UPDATE dbo.KycSessions
SET Cnp = '*********' + RIGHT(Cnp, 4)
WHERE Cnp IS NOT NULL AND LEN(Cnp) = 13 AND Cnp NOT LIKE '%[^0-9]%';
GO
