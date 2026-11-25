# 📊 Claude Code Dashboard - Versión PowerShell

Dashboard residente en Windows usando **PowerShell puro** (sin instalar nada).

## ✨ Características

- ✅ **100% PowerShell** - Sin Python, sin Node.js, sin dependencias
- ✅ **Puerto dinámico** - Busca automáticamente puerto libre (8100-8150)
- ✅ **Auto-refresh** - Configurable cada X minutos
- ✅ **Tiempo real** - Lee datos de Claude Code en vivo
- ✅ **Sin instalación** - Funciona en cualquier Windows
- ✅ **Residente** - Corre como servidor local

## 🚀 Uso

### Opción 1: Haz doble click (Lo más fácil)

```
Haz doble click en: iniciar.bat
```

**¡Listo!** Se abre automáticamente en tu navegador.

### Opción 2: Desde PowerShell

```powershell
cd C:\Users\raul.margeli\Documents\CLAUDE\DASHBOARD
.\servidor.ps1
```

### Opción 3: Puerto específico

```powershell
.\servidor.ps1 -Puerto 8120
```

## 📊 Dashboard

Una vez abierto verás:

```
📊 METRICAS
├─ Tokens consumidos
├─ Costo estimado en USD
├─ Mensajes procesados
└─ Hora actual

📁 PROYECTOS
├─ Lista de proyectos
├─ Rutas
└─ Fecha de modificación
```

## ⚙️ Configuración

**Cambiar intervalo de auto-refresh:**
1. En el dashboard: ingresa minutos (ej: 5, 10, 30)
2. Click en "Guardar"
3. Se guarda automáticamente

## 🛑 Detener

**Presiona `Ctrl+C` en PowerShell**

## 📁 Archivos

```
DASHBOARD/
├─ servidor.ps1          ← Script principal PowerShell
├─ iniciar.bat           ← Ejecutar fácilmente
└─ static/
   └─ dashboard.html     ← Frontend HTML/CSS/JS
```

## ⚡ Ventajas vs Python

| Aspecto | PowerShell | Python |
|---------|-----------|--------|
| Instalación | ✅ Nativa en Windows | ❌ Descargar e instalar |
| Dependencias | ✅ Ninguna | ❌ pip + FastAPI + PyInstaller |
| Tiempo inicio | ✅ Inmediato | ⏱️ Más lento |
| Compilación | ✅ No necesaria | ❌ PyInstaller required |
| Portabilidad | ✅ Script .ps1 | ⚠️ .exe únicamente |

## 🔧 Customización

**Cambiar puerto rango:**
Edita `servidor.ps1`, línea `function Get-PuertoDisponible`:
```powershell
function Get-PuertoDisponible {
    param([int]$PuertoInicio = 8100, [int]$PuertoFin = 8150)  # ← Cambiar aquí
```

**Cambiar HTML:**
Edita `static/dashboard.html` - es HTML/CSS/JavaScript estándar

**Cambiar datos mostrados:**
Edita `función Get-ClaudeData` en `servidor.ps1`

## 🔗 URL

```
http://localhost:8100  (o puerto encontrado automáticamente)
```

Aparecerá en la consola PowerShell cuando inicie.

## 🐛 Solución de problemas

**"El puerto está en uso"**
- El script automáticamente busca otro puerto (8100-8150)
- O cierra la aplicación que usa el puerto

**"Acceso denegado en PowerShell"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"No veo datos"**
- Verifica que Claude Code Desktop está instalado
- Espera 5 segundos a que cargue

**"El navegador no abre"**
- Abre manualmente: `http://localhost:8XXX` (el puerto sale en la consola)

## 📝 Log

PowerShell muestra en tiempo real:
```
✅ Servidor activo
🌐 URL: http://localhost:8120
▶️  Escuchando solicitudes...
```

## 🎯 Próximas mejoras

- [ ] Leer historial de sesiones
- [ ] Gráficos con Chart.js
- [ ] Export a PDF
- [ ] Integración con API de Claude
- [ ] Almacenamiento de histórico

## 📞 Soporte

¿Problemas?
raul.margeli@inetum.com

---

**¡Disfruta tu dashboard! 📊**
