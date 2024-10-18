# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["CoupGameBackend.csproj", "."]
RUN dotnet restore "CoupGameBackend.csproj"

# Copy the remaining source code and publish the application
COPY . .
RUN dotnet publish "CoupGameBackend.csproj" -c Release -o /app/publish

# Stage 2: Create the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy the published application from the build stage
COPY --from=build /app/publish .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Set environment variables for ASP.NET Core
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Entry point to run the application
ENTRYPOINT ["dotnet", "CoupGameBackend.dll"]