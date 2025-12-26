# PDV Master - Development Start Script for Windows
# Usage: .\start-dev.ps1

param(
    [switch]$Clean,
    [switch]$SkipHealth,
    [int]$Timeout = 300
)

$ErrorActionPreference = "Stop"

# Colors for output (simplified for compatibility)
$Green = ""
$Red = ""
$Yellow = ""
$Blue = ""
$Reset = ""

function Write-Success($Message) {
    Write-Host "$Green✓$Reset $Message" -ForegroundColor Green
}

function Write-Error($Message) {
    Write-Host "$Red✗$Reset $Message" -ForegroundColor Red
}

function Write-Info($Message) {
    Write-Host "$Blueℹ$Reset $Message" -ForegroundColor Blue
}

function Write-Warning($Message) {
    Write-Host "$Yellow⚠$Reset $Message" -ForegroundColor Yellow
}

function Test-Docker {
    Write-Info "Checking Docker status..."
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker found: $dockerVersion"
            return $true
        } else {
            throw "Docker not running"
        }
    } catch {
        Write-Error "Docker not found or not running"
        Write-Info "Please start Docker Desktop and wait for it to initialize"
        exit 1
    }
}

function Test-DockerCompose {
    Write-Info "Checking Docker Compose..."
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose found: $composeVersion"
            return $true
        } else {
            throw "Docker Compose not available"
        }
    } catch {
        Write-Error "Docker Compose not found. Please install Docker Desktop."
        exit 1
    }
}

function Test-Port($Port) {
    $connections = netstat -ano | findstr ":$Port " 2>$null
    if ($connections) {
        Write-Warning "Port $Port is in use. This may cause issues."
        return $false
    } else {
        Write-Success "Port $Port is available"
        return $true
    }
}

function Start-Services {
    Write-Info "Starting PDV Master services..."

    # Test ports
    Test-Port 3000 # Frontend
    Test-Port 3001 # Backend
    Test-Port 5432 # PostgreSQL
    Test-Port 5050 # pgAdmin

    # Use simple compose file (more reliable)
    Write-Info "Using docker-compose.simple.yml (most compatible)"
    $composeFile = "docker-compose.simple.yml"

    if (!(Test-Path $composeFile)) {
        Write-Error "Compose file not found: $composeFile"
        exit 1
    }

    # Clean if requested
    if ($Clean) {
        Write-Info "Cleaning previous containers..."
        docker-compose -f $composeFile down -v --rmi local 2>$null
        docker system prune -f 2>$null
    }

    # Start services
    Write-Info "Building and starting services..."
    Write-Info "This may take 2-5 minutes on first run..."

    try {
        docker-compose -f $composeFile up --build -d

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Services started successfully!"
        } else {
            throw "Failed to start services"
        }
    } catch {
        Write-Error "Failed to start services: $($_.Exception.Message)"
        Write-Info "Checking logs..."
        docker-compose -f $composeFile logs
        exit 1
    }
}

function Wait-Health {
    if ($SkipHealth) {
        Write-Info "Skipping health checks (--skiphealth)"
        return
    }

    Write-Info "Waiting for services to be healthy (timeout: ${Timeout}s)..."

    $services = @(
        @{ Name = "PostgreSQL"; Url = "http://localhost:5432"; Method = "TCP" },
        @{ Name = "Backend API"; Url = "http://localhost:3001/health"; Method = "HTTP" },
        @{ Name = "Frontend"; Url = "http://localhost:3000"; Method = "HTTP" }
    )

    $startTime = Get-Date

    foreach ($service in $services) {
        Write-Info "Checking $($service.Name)..."
        $healthy = $false
        $attempts = 0
        $maxAttempts = 60

        while (!$healthy -and $attempts -lt $maxAttempts) {
            try {
                if ($service.Method -eq "TCP") {
                    $connection = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue
                    $healthy = $connection.TcpTestSucceeded
                } else {
                    $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 5 -UseBasicParsing
                    $healthy = $response.StatusCode -eq 200
                }

                if ($healthy) {
                    Write-Success "$($service.Name) is healthy"
                    break
                }
            } catch {
                # Expected for unhealthy services
            }

            $attempts++
            Start-Sleep -Seconds 2

            # Check timeout
            $elapsed = ((Get-Date) - $startTime).TotalSeconds
            if ($elapsed -gt $Timeout) {
                Write-Error "Timeout waiting for $($service.Name)"
                break
            }
        }

        if (!$healthy) {
            Write-Error "$($service.Name) failed to become healthy"
        }
    }

    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    Write-Success "Health check completed in $($elapsed.ToString("F1"))s"
}

function Show-Status {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║             PDV Master Started!              ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "🌐 Frontend (React):$Green    http://localhost:3000$Reset"
    Write-Host "🚀 Backend API:     $Green    http://localhost:3001$Reset"
    Write-Host "🏥 Health Check:    $Green    http://localhost:3001/health$Reset"
    Write-Host "🐘 PostgreSQL:      $Green    localhost:5432$Reset"
    Write-Host "📊 pgAdmin:       $Green      http://localhost:5050$Reset"
    Write-Host "                    (admin@pdvmaster.local / admin123)"
    Write-Host ""
    Write-Host "📋 Useful commands:" -ForegroundColor Yellow
    Write-Host "   • docker-compose -f $composeFile logs -f    # View logs"
    Write-Host "   • docker-compose -f $composeFile down       # Stop services"
    Write-Host "   • docker-compose -f $composeFile restart    # Restart"
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   • If ports are in use, close conflicting applications"
    Write-Host "   • Try './start-dev.ps1 -Clean' to clean restart"
    Write-Host "   • Check docker-compose logs for detailed errors"
    Write-Host ""
}

# Main execution
Write-Host "🚀 Starting PDV Master Development Environment" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Pre-flight checks
Test-Docker
Test-DockerCompose

# Start services
Start-Services

# Health checks
Wait-Health

# Show status
Show-Status

Write-Success "PDV Master is ready for development! 🎉"
