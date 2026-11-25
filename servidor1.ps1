param([int]$Puerto = 8100)
$ErrorActionPreference = 'SilentlyContinue'

# ---- CONFIG -------------------------------------------------------------
$Raices = @("$env:USERPROFILE\.claude\projects", "$env:USERPROFILE\.config\claude\projects")
if ($env:CLAUDE_CONFIG_DIR) { $Raices += (Join-Path $env:CLAUDE_CONFIG_DIR 'projects') }
$IdleSeg = 300   # un hueco > 5 min entre mensajes NO cuenta como tiempo de uso

# USD por millon de tokens: entrada, salida, escritura cache, lectura cache (EDITABLE)
function Get-Precio([string]$m) {
    if ($m -match 'opus-(3|4(-1)?)(-\d{8})?$') { return 15, 75, 18.75, 1.5 }
    if ($m -match 'opus')   { return 5, 25, 6.25, 0.5 }
    if ($m -match 'haiku-3') { return 0.8, 4, 1, 0.08 }
    if ($m -match 'haiku')  { return 1, 5, 1.25, 0.1 }
    return 3, 15, 3.75, 0.3   # sonnet y desconocidos
}

# ---- LECTURA ------------------------------------------------------------
$Cache = @{}
function Read-Archivo($f) {
    $rows = New-Object Collections.Generic.List[object]
    $fs = [IO.File]::Open($f.FullName, 'Open', 'Read', 'ReadWrite')
    $sr = New-Object IO.StreamReader($fs)
    while ($null -ne ($l = $sr.ReadLine())) {
        if ($l.IndexOf('"usage"') -lt 0) { continue }
        $o = $l | ConvertFrom-Json
        $u = $o.message.usage; $m = $o.message.model
        if (-not $u -or -not $m -or $m -like '<*') { continue }
        $ts = $o.timestamp
        $dt = if ($ts -is [datetime]) { $ts.ToLocalTime() } else { [datetime]::Parse($ts, [Globalization.CultureInfo]::InvariantCulture, 'RoundtripKind').ToLocalTime() }
        $p = if ($o.cwd) { Split-Path -Leaf (($o.cwd -replace '[\\/]\.claude[\\/]worktrees[\\/].*$', '').TrimEnd('\', '/')) } else { $f.Directory.Name }
        $id = if ($o.message.id) { "$($o.message.id):$($o.requestId)" } else { "$($o.uuid)" }
        $rows.Add(@{ k = $id; t = $dt.Ticks; p = $p; m = $m
            i = [double]$u.input_tokens; o = [double]$u.output_tokens
            cw = [double]$u.cache_creation_input_tokens; cr = [double]$u.cache_read_input_tokens })
    }
    $sr.Dispose(); $fs.Dispose()
    return , $rows
}

function Get-Datos {
    $files = foreach ($r in $Raices) { if (Test-Path $r) { Get-ChildItem $r -Recurse -Filter *.jsonl } }
    $vistos = @{}; $all = New-Object Collections.Generic.List[object]
    foreach ($f in ($files | Sort-Object FullName)) {
        $c = $Cache[$f.FullName]
        if (-not $c -or $c.l -ne $f.Length -or $c.w -ne $f.LastWriteTimeUtc.Ticks) {
            $c = @{ l = $f.Length; w = $f.LastWriteTimeUtc.Ticks; rows = (Read-Archivo $f) }
            $Cache[$f.FullName] = $c
        }
        foreach ($x in $c.rows) { if ($vistos.ContainsKey($x.k)) { continue }; $vistos[$x.k] = 1; $all.Add($x) }
    }
    $all = $all | Sort-Object { $_.t }
    $precios = @{}; $b = @{}; $lastG = 0; $lastP = @{}
    foreach ($x in $all) {
        if (-not $precios.ContainsKey($x.m)) { $precios[$x.m] = Get-Precio $x.m }
        $pr = $precios[$x.m]
        $coste = ($x.i * $pr[0] + $x.o * $pr[1] + $x.cw * $pr[2] + $x.cr * $pr[3]) / 1e6
        $g = 0; $s = 0
        if ($lastG -gt 0) { $d = ($x.t - $lastG) / 1e7; if ($d -le $IdleSeg) { $g = $d } }
        $lp = $lastP[$x.p]
        if ($lp) { $d = ($x.t - $lp) / 1e7; if ($d -le $IdleSeg) { $s = $d } }
        $lastG = $x.t; $lastP[$x.p] = $x.t
        $dt = [datetime]::new($x.t)
        $key = '{0:yyyy-MM-dd}|{0:HH}|{1}|{2}' -f $dt, $x.p, $x.m
        if (-not $b.ContainsKey($key)) {
            $b[$key] = @{ d = $dt.ToString('yyyy-MM-dd'); h = $dt.Hour; p = $x.p; m = $x.m; i = 0; o = 0; cw = 0; cr = 0; c = 0; n = 0; s = 0; g = 0 }
        }
        $r = $b[$key]
        $r.i += $x.i; $r.o += $x.o; $r.cw += $x.cw; $r.cr += $x.cr
        $r.c += $coste; $r.n++; $r.s += $s; $r.g += $g
    }
    return @{ generado = (Get-Date).ToString('s'); archivos = @($files).Count; mensajes = $all.Count; rows = @($b.Values) }
}

# ---- SERVIDOR -----------------------------------------------------------
function Get-PuertoLibre($ini) {
    for ($p = $ini; $p -le $ini + 50; $p++) { if (-not (Get-NetTCPConnection -LocalPort $p)) { return $p } }
    return $ini
}
$Puerto = Get-PuertoLibre $Puerto
$estatico = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'static'

Write-Host "`n== Claude Code Analytics ==" -ForegroundColor Cyan
foreach ($r in $Raices) { if (Test-Path $r) { Write-Host "[OK] Datos: $r" } }

$listener = New-Object System.Net.HttpListener
try {
    $listener.Prefixes.Add("http://localhost:$Puerto/"); $listener.Start()
    Write-Host "[OK] http://localhost:$Puerto  (Ctrl+C para parar)`n"
    Start-Process "http://localhost:$Puerto"
    while ($listener.IsListening) {
        $ctx = $listener.GetContext(); $res = $ctx.Response
        try {
            $res.Headers.Add('Cache-Control', 'no-cache')
            $ruta = $ctx.Request.Url.LocalPath
            if ($ruta -eq '/api/data') {
                $res.ContentType = 'application/json; charset=utf-8'
                $buf = [Text.Encoding]::UTF8.GetBytes(((Get-Datos) | ConvertTo-Json -Depth 4 -Compress))
            } else {
                $nombre = if ($ruta -like '/static/*') { Split-Path -Leaf $ruta } else { 'dashboard.html' }
                $fich = Join-Path $estatico $nombre
                if (Test-Path $fich -PathType Leaf) {
                    $ext = [IO.Path]::GetExtension($fich).ToLower()
                    $res.ContentType = switch ($ext) { '.css' { 'text/css; charset=utf-8' } '.js' { 'application/javascript; charset=utf-8' } '.svg' { 'image/svg+xml' } '.png' { 'image/png' } default { 'text/html; charset=utf-8' } }
                    $buf = [IO.File]::ReadAllBytes($fich)
                } else { $res.StatusCode = 404; $buf = [Text.Encoding]::UTF8.GetBytes('404') }
            }
            $res.OutputStream.Write($buf, 0, $buf.Length)
        } catch { Write-Host "[ERROR] $_" -ForegroundColor Red }
        finally { $res.OutputStream.Close() }
    }
} finally { $listener.Stop() }
