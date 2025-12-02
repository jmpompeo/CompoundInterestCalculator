using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace CompoundInterestCalculatorTests.Integration;

public class ControllerLoggingTests : IClassFixture<LoggingTestFactory>
{
    private readonly LoggingTestFactory _factory;

    public ControllerLoggingTests(LoggingTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ContributionGrowth_WhenValidationFails_LogsPlainLanguageReason()
    {
        _factory.LoggerProvider.Clear();
        var client = _factory.CreateClient();

        var request = new
        {
            principal = -1m,
            annualRatePercent = 5m,
            compoundingCadence = "Annual",
            durationYears = 5,
            monthlyContribution = 100m
        };

        _ = await client.PostAsJsonAsync("/api/v1/growth/contribution", request);

        var logEntry = _factory.LoggerProvider.Entries
            .FirstOrDefault(entry => entry.Category.Contains("GrowthController"));

        Assert.NotNull(logEntry);
        Assert.Contains("validation", logEntry!.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("principal", logEntry.Message, StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class LoggingTestFactory : WebApplicationFactory<Program>
{
    public TestLoggerProvider LoggerProvider { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddProvider(LoggerProvider);
        });
    }
}

public sealed record LogEntry(LogLevel Level, string Category, string Message, Exception? Exception);

public sealed class TestLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<LogEntry> _entries = new();

    public IEnumerable<LogEntry> Entries => _entries.ToArray();

    public ILogger CreateLogger(string categoryName) => new TestLogger(categoryName, _entries);

    public void Dispose() { }

    public void Clear()
    {
        while (_entries.TryDequeue(out _))
        {
        }
    }

    private sealed class TestLogger : ILogger
    {
        private readonly string _categoryName;
        private readonly ConcurrentQueue<LogEntry> _entries;

        public TestLogger(string categoryName, ConcurrentQueue<LogEntry> entries)
        {
            _categoryName = categoryName;
            _entries = entries;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var message = formatter(state, exception);
            _entries.Enqueue(new LogEntry(logLevel, _categoryName, message, exception));
        }
    }
}
