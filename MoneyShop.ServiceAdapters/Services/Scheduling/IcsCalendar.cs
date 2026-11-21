using System.Globalization;
using System.Text;

namespace MoneyShop.ServiceAdapters.Services.Scheduling;

/// <summary>One event in an iCalendar file.</summary>
public record IcsEvent(
    string Uid,
    DateTime StartUtc,
    int DurationMinutes,
    string Summary,
    string? Description = null,
    string? Location = null,
    int Sequence = 0,
    bool Cancelled = false,
    string? OrganizerEmail = null,
    string? AttendeeEmail = null);

/// <summary>
/// Minimal RFC 5545 writer: invitations attached to emails (METHOD:REQUEST / CANCEL) and the
/// broker's subscribable calendar (METHOD:PUBLISH). Times are written in UTC; Outlook, Google and
/// iPhone show them in the reader's own time zone. The same UID with a higher SEQUENCE updates an
/// event the reader already has; METHOD:CANCEL removes it.
/// </summary>
public static class IcsCalendar
{
    public const string ProductId = "-//MoneyShop//CRM//RO";

    public static string Invitation(IcsEvent ev) =>
        Build(ev.Cancelled ? "CANCEL" : "REQUEST", "MoneyShop – programare", new[] { ev });

    public static string Feed(string calendarName, IEnumerable<IcsEvent> events) =>
        Build("PUBLISH", calendarName, events);

    public static string AppointmentUid(int appointmentId) => $"appointment-{appointmentId}@moneyshop.ro";

    /// <summary>Monotonic version for an appointment: minutes since 2020 of its last update.</summary>
    public static int SequenceFor(DateTime updatedAtUtc) =>
        (int)Math.Max(0, (updatedAtUtc - new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMinutes);

    private static string Build(string method, string calendarName, IEnumerable<IcsEvent> events)
    {
        var sb = new StringBuilder();
        Line(sb, "BEGIN:VCALENDAR");
        Line(sb, "VERSION:2.0");
        Line(sb, $"PRODID:{ProductId}");
        Line(sb, "CALSCALE:GREGORIAN");
        Line(sb, $"METHOD:{method}");
        Line(sb, $"X-WR-CALNAME:{Escape(calendarName)}");
        Line(sb, "X-PUBLISHED-TTL:PT15M");
        var stamp = Utc(DateTime.UtcNow);
        foreach (var ev in events)
        {
            Line(sb, "BEGIN:VEVENT");
            Line(sb, $"UID:{Escape(ev.Uid)}");
            Line(sb, $"DTSTAMP:{stamp}");
            Line(sb, $"DTSTART:{Utc(ev.StartUtc)}");
            Line(sb, $"DTEND:{Utc(ev.StartUtc.AddMinutes(ev.DurationMinutes))}");
            Line(sb, $"SEQUENCE:{ev.Sequence}");
            Line(sb, $"STATUS:{(ev.Cancelled ? "CANCELLED" : "CONFIRMED")}");
            Line(sb, $"SUMMARY:{Escape(ev.Summary)}");
            if (!string.IsNullOrWhiteSpace(ev.Description)) Line(sb, $"DESCRIPTION:{Escape(ev.Description)}");
            if (!string.IsNullOrWhiteSpace(ev.Location)) Line(sb, $"LOCATION:{Escape(ev.Location)}");
            if (!string.IsNullOrWhiteSpace(ev.OrganizerEmail)) Line(sb, $"ORGANIZER;CN=MoneyShop:mailto:{ev.OrganizerEmail}");
            if (!string.IsNullOrWhiteSpace(ev.AttendeeEmail)) Line(sb, $"ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:{ev.AttendeeEmail}");
            if (!ev.Cancelled)
            {
                Line(sb, "BEGIN:VALARM");
                Line(sb, "ACTION:DISPLAY");
                Line(sb, "DESCRIPTION:Apel MoneyShop");
                Line(sb, "TRIGGER:-PT15M");
                Line(sb, "END:VALARM");
            }
            Line(sb, "END:VEVENT");
        }
        Line(sb, "END:VCALENDAR");
        return sb.ToString();
    }

    private static string Utc(DateTime value) =>
        DateTime.SpecifyKind(value, DateTimeKind.Utc).ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);

    /// <summary>Escapes TEXT values (backslash, semicolon, comma, newlines).</summary>
    public static string Escape(string value) => value
        .Replace("\\", "\\\\")
        .Replace(";", "\\;")
        .Replace(",", "\\,")
        .Replace("\r\n", "\\n")
        .Replace("\n", "\\n")
        .Replace("\r", "\\n");

    /// <summary>Writes a content line, folded at 75 octets as RFC 5545 requires, ending in CRLF.</summary>
    private static void Line(StringBuilder sb, string line)
    {
        var bytes = Encoding.UTF8.GetBytes(line);
        if (bytes.Length <= 75)
        {
            sb.Append(line).Append("\r\n");
            return;
        }
        var current = new StringBuilder();
        var currentBytes = 0;
        var limit = 75;
        foreach (var rune in line.EnumerateRunes())
        {
            var runeBytes = rune.Utf8SequenceLength;
            if (currentBytes + runeBytes > limit)
            {
                sb.Append(current).Append("\r\n ");
                current.Clear();
                currentBytes = 0;
                limit = 74; // continuation lines start with a space
            }
            current.Append(rune.ToString());
            currentBytes += runeBytes;
        }
        sb.Append(current).Append("\r\n");
    }
}
