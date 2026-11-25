param([int]$Puerto = 8100)
$ErrorActionPreference = "SilentlyContinue"

function Get-PuertoDisponible {
    for ($p = 8100; $p -le 8150; $p++) {
        if (-not (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue)) { return $p }
    }
    return 8100
}

function Get-ClaudeMetricasCompletas {
    $claudePath = "$env:LOCALAPPDATA\Claude-Data\claude_pzs8sxrjxfjjc"
    $usagePath = "$claudePath\plan-usage-history.json"
    $sessionsPath = "$claudePath\claude-code-sessions"
    $configPath = "$claudePath\config.json"

    # Detectar plan - Por defecto usuario PAGO (180EUR)
    $plan = "Paid"
    $limiteMensual = 180
    $moneda = "EUR"

    if (Test-Path $configPath) {
        try {
            $config = Get-Content $configPath -Raw | ConvertFrom-Json
            if ($config.plan) { $plan = $config.plan }
            if ($config.subscription) { $plan = $config.subscription }
        } catch {}
    }

    # Solo cambiar a Free si está explícitamente marcado
    if ($plan -eq "Free") {
        $limiteMensual = 20
        $moneda = "USD"
    }

    $datos = @{
        plan = $plan
        moneda = $moneda
        limite_mensual_config = $limiteMensual
        tokens_hoy = 0
        total_gasto = 0
        dias = @{}
        proyectos = @{}
        modelos = @{}
        por_fecha_modelo = @{}
        por_fecha_proyecto = @{}
        por_fecha_hora = @{}
        gasto_por_proyecto = @{}
        gasto_por_modelo = @{}
        tokens_por_modelo = @{}
        tokens_por_proyecto = @{}
    }

    # Leer tokens hoy
    $buddyPath = "$claudePath\buddy-tokens.json"
    if (Test-Path $buddyPath) {
        $buddy = Get-Content $buddyPath -Raw | ConvertFrom-Json
        $datos.tokens_hoy = $buddy."tokens-today".tokens
    }

    # Leer gasto histórico - SOLO MES ACTUAL
    if (Test-Path $usagePath) {
        $usage = Get-Content $usagePath -Raw | ConvertFrom-Json
        $epoch = [datetime]"1970-01-01"
        $haceUnesMes = (Get-Date).AddDays(-30)

        if ($usage.samples) {
            $diasDict = @{}
            foreach ($sample in $usage.samples) {
                if ($sample.u.xu) {
                    $fecha = $epoch.AddMilliseconds($sample.t).ToString("yyyy-MM-dd")
                    $fechaObj = [datetime]::ParseExact($fecha, "yyyy-MM-dd", $null)

                    # Solo contar datos del último mes
                    if ($fechaObj -ge $haceUnesMes) {
                        $hora = $epoch.AddMilliseconds($sample.t).ToString("HH")

                        if (-not $diasDict[$fecha]) {
                            $diasDict[$fecha] = @{ gasto = 0; horas = @{} }
                        }

                        if (-not $diasDict[$fecha].horas[$hora]) {
                            $diasDict[$fecha].horas[$hora] = 0
                        }

                        $diasDict[$fecha].gasto += [double]$sample.u.xu
                        $datos.total_gasto += [double]$sample.u.xu
                    }
                }
            }

            foreach ($fecha in $diasDict.Keys | Sort-Object) {
                $datos.dias[$fecha] = $diasDict[$fecha]
            }
        }
    }

    # Leer sesiones y vincular con fechas
    if (Test-Path $sessionsPath) {
        $sesiones = @(Get-ChildItem $sessionsPath -Recurse -Filter "local_*.json" -ErrorAction SilentlyContinue)
        $epoch = [datetime]"1970-01-01"

        foreach ($sesion in $sesiones) {
            $json = Get-Content $sesion.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if (-not $json) { continue }

            $modelo = if ($json.model) { $json.model } else { "unknown" }
            $proyecto = if ($json.folderPlace) { Split-Path -Leaf $json.folderPlace } else { "Sin proyecto" }

            # Convertir createdAt a fecha legible
            $fecha = "unknown"
            $hora = "00"
            if ($json.createdAt) {
                try {
                    # Intentar convertir como número (UNIX timestamp en ms)
                    if ($json.createdAt -is [int] -or $json.createdAt -is [long] -or $json.createdAt -is [double]) {
                        $timestamp = [int64]$json.createdAt
                        if ($timestamp -gt 0) {
                            $epoch = [datetime]"1970-01-01"
                            $fecha = $epoch.AddMilliseconds($timestamp).ToString("yyyy-MM-dd")
                            $hora = $epoch.AddMilliseconds($timestamp).ToString("HH")
                        }
                    } else {
                        # Es string ISO
                        $fechaStr = $json.createdAt.ToString()
                        if ($fechaStr -match "T") {
                            $fecha = $fechaStr -replace "T.*", ""
                            if ($fechaStr -match "T(\d{2})") { $hora = $matches[1] }
                        } else {
                            $fecha = $fechaStr
                        }
                    }
                } catch {
                    $fecha = "unknown"
                    $hora = "00"
                }
            }

            # Proyectos
            if (-not $datos.proyectos[$proyecto]) {
                $datos.proyectos[$proyecto] = @{ sesiones = 0; modelos = @{}; fechas = @{}; gasto = 0 }
            }
            $datos.proyectos[$proyecto].sesiones++
            if (-not $datos.proyectos[$proyecto].modelos[$modelo]) {
                $datos.proyectos[$proyecto].modelos[$modelo] = 0
            }
            $datos.proyectos[$proyecto].modelos[$modelo]++
            if (-not $datos.proyectos[$proyecto].fechas[$fecha]) {
                $datos.proyectos[$proyecto].fechas[$fecha] = 0
            }
            $datos.proyectos[$proyecto].fechas[$fecha]++


            # Modelos
            if (-not $datos.modelos[$modelo]) {
                $datos.modelos[$modelo] = @{ sesiones = 0; proyectos = @{}; fechas = @{}; gasto = 0 }
            }
            $datos.modelos[$modelo].sesiones++
            if (-not $datos.modelos[$modelo].proyectos[$proyecto]) {
                $datos.modelos[$modelo].proyectos[$proyecto] = 0
            }
            $datos.modelos[$modelo].proyectos[$proyecto]++
            if (-not $datos.modelos[$modelo].fechas[$fecha]) {
                $datos.modelos[$modelo].fechas[$fecha] = 0
            }
            $datos.modelos[$modelo].fechas[$fecha]++


            # Fecha-Modelo (convertir a formato legible)
            $fechaLegible = if ($fecha -ne "unknown") { $fecha } else { "unknown" }
            $key = "$fechaLegible-$modelo"
            if (-not $datos.por_fecha_modelo[$key]) {
                $datos.por_fecha_modelo[$key] = @{ sesiones = 0; proyectos = @{}; horas = @{} }
            }
            $datos.por_fecha_modelo[$key].sesiones++
            if (-not $datos.por_fecha_modelo[$key].proyectos[$proyecto]) {
                $datos.por_fecha_modelo[$key].proyectos[$proyecto] = 0
            }
            $datos.por_fecha_modelo[$key].proyectos[$proyecto]++
            if (-not $datos.por_fecha_modelo[$key].horas[$hora]) {
                $datos.por_fecha_modelo[$key].horas[$hora] = 0
            }
            $datos.por_fecha_modelo[$key].horas[$hora]++

            # Fecha-Proyecto (convertir a formato legible)
            $key2 = "$fechaLegible-$proyecto"
            if (-not $datos.por_fecha_proyecto[$key2]) {
                $datos.por_fecha_proyecto[$key2] = @{ sesiones = 0; modelos = @{}; horas = @{} }
            }
            $datos.por_fecha_proyecto[$key2].sesiones++
            if (-not $datos.por_fecha_proyecto[$key2].modelos[$modelo]) {
                $datos.por_fecha_proyecto[$key2].modelos[$modelo] = 0
            }
            $datos.por_fecha_proyecto[$key2].modelos[$modelo]++
            if (-not $datos.por_fecha_proyecto[$key2].horas[$hora]) {
                $datos.por_fecha_proyecto[$key2].horas[$hora] = 0
            }
            $datos.por_fecha_proyecto[$key2].horas[$hora]++

            # Fecha-Hora
            $key3 = "$fechaLegible-$hora"
            if (-not $datos.por_fecha_hora[$key3]) {
                $datos.por_fecha_hora[$key3] = @{ sesiones = 0; modelos = @{}; proyectos = @{} }
            }
            $datos.por_fecha_hora[$key3].sesiones++
            if (-not $datos.por_fecha_hora[$key3].modelos[$modelo]) {
                $datos.por_fecha_hora[$key3].modelos[$modelo] = 0
            }
            $datos.por_fecha_hora[$key3].modelos[$modelo]++
            if (-not $datos.por_fecha_hora[$key3].proyectos[$proyecto]) {
                $datos.por_fecha_hora[$key3].proyectos[$proyecto] = 0
            }
            $datos.por_fecha_hora[$key3].proyectos[$proyecto]++
        }
    }

    # Pase final: Calcular gasto por proyecto y modelo
    foreach ($fecha in $datos.dias.Keys) {
        $gasto = $datos.dias[$fecha].gasto
        if ($gasto -gt 0) {
            # Proyectos que se usaron este día
            $proyectosHoy = @()
            foreach ($proj in $datos.proyectos.Keys) {
                if ($datos.proyectos[$proj].fechas[$fecha] -gt 0) {
                    $proyectosHoy += $proj
                }
            }

            # Modelos que se usaron este día
            $modelosHoy = @()
            foreach ($mod in $datos.modelos.Keys) {
                if ($datos.modelos[$mod].fechas[$fecha] -gt 0) {
                    $modelosHoy += $mod
                }
            }

            # Distribuir gasto entre proyectos
            if ($proyectosHoy.Count -gt 0) {
                $gastoXProyecto = $gasto / $proyectosHoy.Count
                foreach ($proj in $proyectosHoy) {
                    $datos.proyectos[$proj].gasto += $gastoXProyecto
                }
            }

            # Distribuir gasto entre modelos
            if ($modelosHoy.Count -gt 0) {
                $gastoXModelo = $gasto / $modelosHoy.Count
                foreach ($mod in $modelosHoy) {
                    $datos.modelos[$mod].gasto += $gastoXModelo
                }
            }

            # Estimar tokens basados en gasto
            if ($modelosHoy.Count -gt 0) {
                $tokensEstimados = $gasto * 55000
                $tokensXModelo = $tokensEstimados / $modelosHoy.Count
                foreach ($mod in $modelosHoy) {
                    if (-not $datos.tokens_por_modelo[$mod]) {
                        $datos.tokens_por_modelo[$mod] = 0
                    }
                    $datos.tokens_por_modelo[$mod] += $tokensXModelo
                }
            }

            if ($proyectosHoy.Count -gt 0) {
                $tokensEstimados = $gasto * 55000
                $tokensXProyecto = $tokensEstimados / $proyectosHoy.Count
                foreach ($proj in $proyectosHoy) {
                    if (-not $datos.tokens_por_proyecto[$proj]) {
                        $datos.tokens_por_proyecto[$proj] = 0
                    }
                    $datos.tokens_por_proyecto[$proj] += $tokensXProyecto
                }
            }
        }
    }

    # Usar límite detectado de config o default
    if ($datos.limite_mensual_config -eq 0) {
        $datos.limite_mensual_config = 20
    }

    # Agregar porcentaje de uso
    $datos.gasto_porcentaje = [math]::Min(($datos.total_gasto / $datos.limite_mensual_config * 100), 100)
    $datos.limite_mensual = $datos.limite_mensual_config
    $datos.gasto_restante = [math]::Max($datos.limite_mensual_config - $datos.total_gasto, 0)

    return $datos
}

$Puerto = Get-PuertoDisponible
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlFile = Join-Path $scriptDir "static\dashboard.html"

Write-Host "======================================================"
Write-Host "Claude Analytics Dashboard - Premium"
Write-Host "======================================================"
Write-Host "Puerto: $Puerto"
Write-Host ""

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Puerto/")
    $listener.Start()

    Write-Host "[OK] Servidor activo en http://localhost:$Puerto"
    Write-Host ""
    Start-Process "http://localhost:$Puerto"

    Write-Host "[*] Escuchando... (Ctrl+C para detener)"
    Write-Host ""

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $response.Headers.Add("Content-Type", "application/json; charset=utf-8")
        $response.Headers.Add("Cache-Control", "no-cache")

        if ($request.Url.LocalPath -eq "/api/metricas") {
            $metricas = Get-ClaudeMetricasCompletas

            # Debug: imprimir datos de proyectos
            Write-Host "[DEBUG] Proyectos: $($metricas.proyectos.Keys -join ', ')"
            foreach ($proj in $metricas.proyectos.Keys) {
                Write-Host "[DEBUG] $proj - Sesiones: $($metricas.proyectos[$proj].sesiones), Dias: $($metricas.proyectos[$proj].fechas.Count), Modelos: $($metricas.proyectos[$proj].modelos.Count)"
            }

            $json = $metricas | ConvertTo-Json -Depth 10
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        else {
            $response.Headers["Content-Type"] = "text/html; charset=utf-8"
            $response.Headers["Cache-Control"] = "no-cache, no-store, max-age=0"
            $response.Headers["Pragma"] = "no-cache"
            $response.Headers["Expires"] = "0"
            # Leer el archivo en cada request sin caché
            $htmlContent = [System.IO.File]::ReadAllText($htmlFile, [System.Text.Encoding]::UTF8)
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($htmlContent)
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }

        $response.OutputStream.Close()
    }
}
catch {
    Write-Host "[ERROR] $_"
}
finally {
    if ($listener) { $listener.Stop() }
    Write-Host "[OK] Servidor detenido"
}
