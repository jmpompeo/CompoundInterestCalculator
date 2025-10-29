namespace CompoundInterestCalculator.Api.Telemetry;

public static class ControllerLoggingExtensions
{
    public static void LogValidationFailure(
        this ILogger logger,
        string traceId,
        IDictionary<string, string[]> errors)
    {
        var condensedErrors = string.Join(
            "; ",
            errors.Select(kvp => $"{kvp.Key}: {string.Join(", ", kvp.Value)}"));

        logger.LogWarning(
            "Validation failure for trace {TraceId}. Details: {ValidationErrors}",
            traceId,
            condensedErrors);
    }

    public static void LogCalculationFailure(
        this ILogger logger,
        string traceId,
        Exception exception,
        string message)
    {
        logger.LogError(exception, "Calculation failure for trace {TraceId}: {Message}", traceId, message);
    }
}
