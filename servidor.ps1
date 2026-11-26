param([int]$Puerto = 8100)
$ErrorActionPreference = 'Stop'

# ---- CONFIG -------------------------------------------------------------
$Raices = @("$env:USERPROFILE\.claude\projects", "$env:USERPROFILE\.config\claude\projects")
if ($env:CLAUDE_CONFIG_DIR) { $Raices += (Join-Path $env:CLAUDE_CONFIG_DIR 'projects') }
$IdleSeg = 300   # un hueco > 5 min entre mensajes NO cuenta como tiempo de uso

# ---- MOTOR DE LECTURA (C#, rapido y en segundo plano) --------------------
# PRECIOS: USD por millon de tokens {entrada, salida, escritura cache, lectura cache}. Edita la funcion Price.
$src = @'
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

public class Rec { public long H; public long T; public string P; public string M; public double I; public double O; public double CW; public double CR; }
public class FC { public long Len; public long W; public Rec[] Recs; }
public class Bk { public string D; public int Hr; public string P; public string M; public double I, O, CW, CR, C, KI, KO, KW, KR, S, G; public int N; }

public static class Engine
{
    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
    static readonly Regex RTs = new Regex("\"timestamp\":\"([^\"]+)\"", RegexOptions.Compiled);
    static readonly Regex RMod = new Regex("\"model\":\"([^\"]+)\"", RegexOptions.Compiled);
    static readonly Regex RId = new Regex("\"id\":\"(msg_[^\"]+)\"", RegexOptions.Compiled);
    static readonly Regex RReq = new Regex("\"requestId\":\"([^\"]+)\"", RegexOptions.Compiled);
    static readonly Regex RUid = new Regex("\"uuid\":\"([^\"]+)\"", RegexOptions.Compiled);
    static readonly Regex RCwd = new Regex("\"cwd\":\"((?:[^\"\\\\]|\\\\.)*)\"", RegexOptions.Compiled);
    static readonly Regex RIn = new Regex("\"input_tokens\":(\\d+)", RegexOptions.Compiled);
    static readonly Regex ROut = new Regex("\"output_tokens\":(\\d+)", RegexOptions.Compiled);
    static readonly Regex RCw = new Regex("\"cache_creation_input_tokens\":(\\d+)", RegexOptions.Compiled);
    static readonly Regex RCr = new Regex("\"cache_read_input_tokens\":(\\d+)", RegexOptions.Compiled);
    static readonly Regex ROpusOld = new Regex("opus-(3|4(-1)?)(-\\d{8})?$", RegexOptions.Compiled);

    public static bool Running;
    public static bool Ready;
    public static int Total;
    public static int Done;
    public static long Msgs;
    public static int Ver;
    public static string Json;
    public static string Err;
    public static string Phase = "";
    static readonly ConcurrentDictionary<string, FC> Cache = new ConcurrentDictionary<string, FC>();
    static readonly object Gate = new object();

    // USD por millon de tokens: entrada, salida, escritura cache, lectura cache
    static double[] Price(string m)
    {
        if (ROpusOld.IsMatch(m)) return new double[] { 15, 75, 18.75, 1.5 };
        if (m.Contains("opus")) return new double[] { 5, 25, 6.25, 0.5 };
        if (m.Contains("haiku-3")) return new double[] { 0.8, 4, 1, 0.08 };
        if (m.Contains("haiku")) return new double[] { 1, 5, 1.25, 0.1 };
        return new double[] { 3, 15, 3.75, 0.3 };
    }

    public static bool Start(string[] roots, int idle)
    {
        lock (Gate) { if (Running) return false; Running = true; }
        Thread t = new Thread(delegate ()
        {
            try { Run(roots, idle); }
            catch (Exception e) { Err = e.Message; }
            finally { Running = false; }
        });
        t.IsBackground = true;
        t.Start();
        return true;
    }

    static long Hash(string a, string b)
    {
        unchecked
        {
            ulong h = 14695981039346656037UL;
            foreach (char c in a) { h ^= c; h *= 1099511628211UL; }
            h ^= 124; h *= 1099511628211UL;
            if (b != null) foreach (char c in b) { h ^= c; h *= 1099511628211UL; }
            return (long)h;
        }
    }

    static string Proj(string cwd, string fb)
    {
        if (string.IsNullOrEmpty(cwd)) return fb;
        cwd = cwd.Replace("\\\\", "\\");
        int w = cwd.IndexOf(".claude\\worktrees", StringComparison.OrdinalIgnoreCase);
        if (w < 0) w = cwd.IndexOf(".claude/worktrees", StringComparison.OrdinalIgnoreCase);
        if (w > 0) cwd = cwd.Substring(0, w);
        cwd = cwd.TrimEnd('\\', '/');
        int i = cwd.LastIndexOfAny(new char[] { '\\', '/' });
        string p = i >= 0 ? cwd.Substring(i + 1) : cwd;
        return p.Length > 0 ? p : fb;
    }

    static long Num(Regex r, string s)
    {
        Match m = r.Match(s);
        long v;
        if (m.Success && long.TryParse(m.Groups[1].Value, NumberStyles.None, Inv, out v)) return v;
        return 0;
    }

    static Rec[] ParseFile(string path)
    {
        List<Rec> list = new List<Rec>();
        string fb = Path.GetFileName(Path.GetDirectoryName(path));
        using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (StreamReader sr = new StreamReader(fs, Encoding.UTF8, false, 65536))
        {
            string line;
            while ((line = sr.ReadLine()) != null)
            {
                int u = line.LastIndexOf("\"usage\":{", StringComparison.Ordinal);
                if (u < 0) continue;
                if (line.IndexOf("\"output_tokens\"", u, StringComparison.Ordinal) < 0) continue;
                Match mm = RMod.Match(line);
                if (!mm.Success) continue;
                string model = mm.Groups[1].Value;
                if (model.StartsWith("<")) continue;
                Match mt = RTs.Match(line);
                if (!mt.Success) continue;
                DateTime dt;
                if (!DateTime.TryParse(mt.Groups[1].Value, Inv, DateTimeStyles.RoundtripKind, out dt)) continue;
                string tail = line.Substring(u);
                Rec r = new Rec();
                r.T = dt.ToLocalTime().Ticks;
                r.M = string.Intern(model);
                Match mc = RCwd.Match(line);
                r.P = string.Intern(Proj(mc.Success ? mc.Groups[1].Value : null, fb));
                r.I = Num(RIn, tail); r.O = Num(ROut, tail); r.CW = Num(RCw, tail); r.CR = Num(RCr, tail);
                Match mi = RId.Match(line);
                if (mi.Success)
                {
                    Match mr = RReq.Match(line);
                    r.H = Hash(mi.Groups[1].Value, mr.Success ? mr.Groups[1].Value : null);
                }
                else
                {
                    Match mu = RUid.Match(line);
                    r.H = mu.Success ? Hash("u" + mu.Groups[1].Value, null) : Hash(mt.Groups[1].Value, model + r.I + "/" + r.O);
                }
                list.Add(r);
            }
        }
        return list.ToArray();
    }

    static void Run(string[] roots, int idle)
    {
        Err = null; Phase = "Buscando archivos";
        List<string> files = new List<string>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (string r in roots)
        {
            if (!Directory.Exists(r)) continue;
            foreach (string f in Directory.EnumerateFiles(r, "*.jsonl", SearchOption.AllDirectories))
            {
                string full = Path.GetFullPath(f);
                if (!seen.ContainsKey(full)) { seen[full] = true; files.Add(full); }
            }
        }
        files.Sort(StringComparer.OrdinalIgnoreCase);
        Total = files.Count; Done = 0; Msgs = 0;
        Phase = "Leyendo registros";
        List<string> todo = new List<string>();
        foreach (string f in files)
        {
            FileInfo fi = new FileInfo(f);
            FC c;
            if (Cache.TryGetValue(f, out c) && c.Len == fi.Length && c.W == fi.LastWriteTimeUtc.Ticks)
            { Interlocked.Increment(ref Done); Interlocked.Add(ref Msgs, c.Recs.Length); }
            else todo.Add(f);
        }
        ParallelOptions po = new ParallelOptions();
        po.MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount - 1);
        Parallel.ForEach(todo, po, delegate (string f)
        {
            try
            {
                FileInfo fi = new FileInfo(f);
                long len = fi.Length, w = fi.LastWriteTimeUtc.Ticks;
                Rec[] recs = ParseFile(f);
                FC c = new FC(); c.Len = len; c.W = w; c.Recs = recs;
                Cache[f] = c;
                Interlocked.Add(ref Msgs, recs.Length);
            }
            catch (Exception) { }
            Interlocked.Increment(ref Done);
        });
        Phase = "Calculando costes y tiempos";
        Dictionary<long, Rec> uniq = new Dictionary<long, Rec>();
        foreach (string f in files)
        {
            FC c;
            if (!Cache.TryGetValue(f, out c)) continue;
            foreach (Rec x in c.Recs) uniq[x.H] = x;
        }
        List<Rec> all = new List<Rec>(uniq.Values);
        uniq = null;
        all.Sort(delegate (Rec a, Rec b) { return a.T.CompareTo(b.T); });
        Json = Build(all, idle, files.Count);
        Ver++; Ready = true; Phase = "Listo";
    }

    static string N(double v) { return v.ToString("R", Inv); }
    static string Esc(string s)
    {
        StringBuilder sb = new StringBuilder();
        foreach (char c in s) { if (c == '"') sb.Append("\\\""); else if (c == '\\') sb.Append("\\\\"); else if (c < ' ') sb.Append(' '); else sb.Append(c); }
        return sb.ToString();
    }

    static string Build(List<Rec> all, int idle, int nfiles)
    {
        Dictionary<string, Bk> b = new Dictionary<string, Bk>();
        Dictionary<string, double[]> price = new Dictionary<string, double[]>();
        Dictionary<string, long> lastP = new Dictionary<string, long>();
        long lastG = 0;
        foreach (Rec x in all)
        {
            double[] pr;
            if (!price.TryGetValue(x.M, out pr)) { pr = Price(x.M); price[x.M] = pr; }
            double ki = x.I * pr[0] / 1e6, ko = x.O * pr[1] / 1e6, kw = x.CW * pr[2] / 1e6, kr = x.CR * pr[3] / 1e6;
            double g = 0, s = 0;
            if (lastG > 0) { double d = (x.T - lastG) / 1e7; if (d <= idle) g = d; }
            long lp;
            if (lastP.TryGetValue(x.P, out lp)) { double d2 = (x.T - lp) / 1e7; if (d2 <= idle) s = d2; }
            lastG = x.T; lastP[x.P] = x.T;
            DateTime dt = new DateTime(x.T);
            string day = dt.ToString("yyyy-MM-dd", Inv);
            string key = day + "|" + dt.Hour + "|" + x.P + "|" + x.M;
            Bk k;
            if (!b.TryGetValue(key, out k)) { k = new Bk(); k.D = day; k.Hr = dt.Hour; k.P = x.P; k.M = x.M; b[key] = k; }
            k.I += x.I; k.O += x.O; k.CW += x.CW; k.CR += x.CR;
            k.KI += ki; k.KO += ko; k.KW += kw; k.KR += kr; k.C += ki + ko + kw + kr;
            k.N++; k.S += s; k.G += g;
        }
        StringBuilder sb = new StringBuilder();
        sb.Append("{\"generado\":\"").Append(DateTime.Now.ToString("s", Inv)).Append("\",\"archivos\":").Append(nfiles).Append(",\"mensajes\":").Append(all.Count).Append(",\"rows\":[");
        bool first = true;
        foreach (Bk k in b.Values)
        {
            if (!first) sb.Append(','); first = false;
            sb.Append("{\"d\":\"").Append(k.D).Append("\",\"h\":").Append(k.Hr).Append(",\"p\":\"").Append(Esc(k.P)).Append("\",\"m\":\"").Append(Esc(k.M)).Append("\"");
            sb.Append(",\"i\":").Append(N(k.I)).Append(",\"o\":").Append(N(k.O)).Append(",\"cw\":").Append(N(k.CW)).Append(",\"cr\":").Append(N(k.CR));
            sb.Append(",\"c\":").Append(N(k.C)).Append(",\"n\":").Append(k.N).Append(",\"s\":").Append(N(k.S)).Append(",\"g\":").Append(N(k.G));
            sb.Append(",\"ki\":").Append(N(k.KI)).Append(",\"ko\":").Append(N(k.KO)).Append(",\"kw\":").Append(N(k.KW)).Append(",\"kr\":").Append(N(k.KR)).Append('}');
        }
        return sb.Append("]}").ToString();
    }

    public static string Estado()
    {
        return "{\"listo\":" + (Ready ? "true" : "false") + ",\"cargando\":" + (Running ? "true" : "false") + ",\"fase\":\"" + Esc(Phase) + "\",\"total\":" + Total + ",\"hechos\":" + Done + ",\"mensajes\":" + Msgs + ",\"ver\":" + Ver + ",\"error\":" + (Err == null ? "null" : "\"" + Esc(Err) + "\"") + "}";
    }
}
'@
Add-Type -TypeDefinition $src -Language CSharp

# ---- SERVIDOR -----------------------------------------------------------
function Get-PuertoLibre($ini) {
    for ($p = $ini; $p -le $ini + 50; $p++) {
        try { $l = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $p); $l.Start(); $l.Stop(); return $p } catch { }
    }
    return $ini
}
$Puerto = Get-PuertoLibre $Puerto
$estatico = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'static'

Write-Host "`n== Claude Code Analytics ==" -ForegroundColor Cyan
foreach ($r in $Raices) { if (Test-Path $r) { Write-Host "[OK] Datos: $r" } }
[void][Engine]::Start([string[]]$Raices, [int]$IdleSeg)   # empieza a leer YA, en segundo plano

$listener = New-Object System.Net.HttpListener
try {
    $listener.Prefixes.Add("http://localhost:$Puerto/"); $listener.Start()
    Write-Host "[OK] http://localhost:$Puerto  (Ctrl+C para parar)`n"
    Start-Process "http://localhost:$Puerto"
    $task = $listener.GetContextAsync(); $ultVer = 0; $t0 = Get-Date
    while ($listener.IsListening) {
        if (-not $task.Wait(1000)) {
            if ([Engine]::Running) { Write-Host ("`r  Leyendo registros: {0}/{1} archivos - {2} mensajes   " -f [Engine]::Done, [Engine]::Total, [Engine]::Msgs) -NoNewline }
            elseif ([Engine]::Ver -ne $ultVer) { $ultVer = [Engine]::Ver; Write-Host ("`n[OK] Datos listos: {0} mensajes ({1:N0} s)" -f [Engine]::Msgs, ((Get-Date) - $t0).TotalSeconds) -ForegroundColor Green }
            continue
        }
        $ctx = $task.Result; $task = $listener.GetContextAsync(); $res = $ctx.Response
        try {
            $res.Headers.Add('Cache-Control', 'no-cache')
            $ruta = $ctx.Request.Url.LocalPath
            if ($ruta -eq '/api/estado') {
                $res.ContentType = 'application/json; charset=utf-8'; $buf = [Text.Encoding]::UTF8.GetBytes([Engine]::Estado())
            } elseif ($ruta -eq '/api/refresh') {
                [void][Engine]::Start([string[]]$Raices, [int]$IdleSeg)
                $res.ContentType = 'application/json; charset=utf-8'; $buf = [Text.Encoding]::UTF8.GetBytes([Engine]::Estado())
            } elseif ($ruta -eq '/api/data') {
                $res.ContentType = 'application/json; charset=utf-8'
                $j = [Engine]::Json; if (-not $j) { $j = '{"listo":false,"rows":[]}' }
                $buf = [Text.Encoding]::UTF8.GetBytes($j)
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
