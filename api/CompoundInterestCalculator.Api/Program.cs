using CompoundCalc.Services;
using CompoundCalc.Services.Contracts;
using System.Text.Json.Serialization;
using CompoundInterestCalculator.Api.Mappers;
using CompoundInterestCalculator.Api.Middleware;
using CompoundInterestCalculator.Api.Telemetry;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Versioning;
using Microsoft.OpenApi.Models;
using FluentValidation.AspNetCore;
using CompoundInterestCalculator.Api.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddFluentValidationAutoValidation(options =>
    options.DisableDataAnnotationsValidation = true);
builder.Services.AddValidatorsFromAssemblyContaining<CalculationRequestValidator>();

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
});

builder.Services.AddVersionedApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Compound Interest Calculator API",
        Version = "v1"
    });
});

builder.Services.AddProblemDetails();

builder.Services.AddHealthChecks()
    .AddCheck("configuration", () => HealthCheckResult.Healthy("Configuration settings resolved"));

builder.Services.AddScoped<ICalculationService, CalculationService>();
builder.Services.AddSingleton<CalculationMapper>();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var problemDetails = new ValidationProblemDetails(context.ModelState)
        {
            Type = "https://calc.example.com/errors/validation",
            Title = "Invalid calculation request",
            Status = StatusCodes.Status400BadRequest,
            Detail = "Validation failed. See errors for details.",
            Instance = context.HttpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<CompoundInterestCalculator.Api.Controllers.CalculationsController>>();
        logger.LogValidationFailure(context.HttpContext.TraceIdentifier, problemDetails.Errors);

        return new BadRequestObjectResult(problemDetails);
    };
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    var provider = app.Services.GetRequiredService<IApiVersionDescriptionProvider>();

    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        foreach (var description in provider.ApiVersionDescriptions)
        {
            options.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json",
                $"Compound Interest Calculator API {description.ApiVersion}");
        }
    });
}

app.UseHttpsRedirection();

app.UseMiddleware<CorrelationIdMiddleware>();

app.MapControllers();

app.MapGet("/", () => Results.Json(new
{
    message = "Compound Interest Calculator API",
    documentation = "/swagger",
    readiness = "/health/ready"
}));

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                detail = entry.Value.Description ?? string.Empty
            }),
            version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
            timestamp = DateTimeOffset.UtcNow
        };

        await context.Response.WriteAsJsonAsync(payload);
    }
});

app.Run();

public partial class Program;
