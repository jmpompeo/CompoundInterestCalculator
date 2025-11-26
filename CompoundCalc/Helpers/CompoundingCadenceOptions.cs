using System;
using System.Collections.Generic;
using System.Linq;

namespace CompoundCalc.Helpers;

public static class CompoundingCadenceOptions
{
    private static readonly (string Name, int PeriodsPerYear)[] Schedules =
    [
        ("Annual", 1),
        ("SemiAnnual", 2),
        ("Quarterly", 4),
        ("Monthly", 12)
    ];

    public static IReadOnlyCollection<string> SupportedCadences { get; } =
        [.. Schedules.Select(schedule => schedule.Name)];

    public static bool IsSupported(string? cadence) =>
        TryResolveSchedule(cadence, out _);

    public static int GetPeriodsPerYear(string cadence) =>
        ResolveSchedule(cadence).PeriodsPerYear;

    public static string NormalizeName(string cadence) =>
        ResolveSchedule(cadence).Name;

    private static (string Name, int PeriodsPerYear) ResolveSchedule(string cadence)
    {
        if (TryResolveSchedule(cadence, out var schedule))
        {
            return schedule;
        }

        throw new ArgumentException($"Unsupported compounding cadence '{cadence}'.", nameof(cadence));
    }

    private static bool TryResolveSchedule(string? cadence, out (string Name, int PeriodsPerYear) schedule)
    {
        if (string.IsNullOrWhiteSpace(cadence))
        {
            schedule = default;
            return false;
        }

        foreach (var entry in Schedules)
        {
            if (string.Equals(entry.Name, cadence, StringComparison.OrdinalIgnoreCase))
            {
                schedule = entry;
                return true;
            }
        }

        schedule = default;
        return false;
    }
}
