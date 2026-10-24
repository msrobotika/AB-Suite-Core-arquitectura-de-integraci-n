// AB Suite desktop host. Original code, MIT. Requires only the Windows .NET Framework.
using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Security.Principal;
using System.Text;

class SuiteHost : ApplicationContext {
    Process engine;
    NotifyIcon tray;
    StreamWriter log;
    readonly object logLock = new object();
    readonly string folder = Environment.GetEnvironmentVariable("AB_SUITE_DESKTOP_HOME") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AB Suite");
    readonly bool spanish = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "es";
    string url;
    bool stopping;
    bool noBrowser;
    EventWaitHandle quitSignal;
    System.Windows.Forms.Timer quitTimer;
    string Text(string es, string en) { return spanish ? es : en; }
    void Open() { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
    void Write(string value) { lock(logLock) { if(log != null) { log.WriteLine(DateTime.UtcNow.ToString("o") + " " + value); log.Flush(); } } }
    public SuiteHost(bool headless) {
        noBrowser = headless;
        quitSignal = new EventWaitHandle(false, EventResetMode.AutoReset, "Local\\ABSuite.Quit");
        quitTimer = new System.Windows.Forms.Timer { Interval = 300 };
        quitTimer.Tick += (s,e) => { if(quitSignal.WaitOne(0)) ExitThread(); };
        quitTimer.Start();
        Directory.CreateDirectory(folder);
        Directory.CreateDirectory(Path.Combine(folder, "data"));
        Directory.CreateDirectory(Path.Combine(folder, "logs"));
        log = new StreamWriter(Path.Combine(folder, "logs", "desktop.log"), true);
        string port = Environment.GetEnvironmentVariable("AB_SUITE_PORT") ?? "4170";
        int parsed;
        if(!int.TryParse(port, out parsed) || parsed < 1024 || parsed > 65535) throw new Exception("Invalid local port / Puerto local inválido");
        url = "http://127.0.0.1:" + port + "/";
        var root = AppDomain.CurrentDomain.BaseDirectory;
        var start = new ProcessStartInfo(Path.Combine(root, "runtime", "node", "node.exe"), "scripts/workspace.mjs");
        start.WorkingDirectory = Path.Combine(root, "app");
        start.UseShellExecute = false; start.CreateNoWindow = true;
        start.RedirectStandardOutput = true; start.RedirectStandardError = true; start.RedirectStandardInput = true;
        start.StandardOutputEncoding = Encoding.UTF8; start.StandardErrorEncoding = Encoding.UTF8;
        start.EnvironmentVariables["AB_SUITE_PYTHON"] = Path.Combine(root, "runtime", "python", "python.exe");
        start.EnvironmentVariables["AB_SUITE_DATA_DIR"] = Path.Combine(folder, "data");
        start.EnvironmentVariables["AB_SUITE_DESKTOP"] = "1";
        start.EnvironmentVariables["AB_SUITE_PORT"] = port;
        start.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";
        start.EnvironmentVariables["PYTHONDONTWRITEBYTECODE"] = "1";
        engine = new Process { StartInfo = start, EnableRaisingEvents = true };
        engine.OutputDataReceived += (s,e) => { if(e.Data != null) Write(e.Data); };
        engine.ErrorDataReceived += (s,e) => { if(e.Data != null) Write(e.Data); };
        engine.Exited += (s,e) => { if(!stopping) {
            Write("Suite process exited: " + engine.ExitCode);
            if(tray != null) tray.ShowBalloonTip(8000, "AB Suite", Text("La suite se ha detenido. Consulta el registro en la carpeta de datos.", "The suite stopped. Check the log in the data folder."), ToolTipIcon.Error);
        }};
        if(!headless) {
            var menu = new ContextMenuStrip();
            menu.Items.Add(Text("Abrir AB Suite", "Open AB Suite"), null, (s,e) => Open());
            menu.Items.Add(Text("Datos y registros", "Data and logs"), null, (s,e) => Process.Start(new ProcessStartInfo(folder) { UseShellExecute = true }));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(Text("Cerrar AB Suite", "Quit AB Suite"), null, (s,e) => ExitThread());
            tray = new NotifyIcon { Text = "AB Suite", Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath), ContextMenuStrip = menu, Visible = true };
            tray.DoubleClick += (s,e) => Open();
        }
        engine.Start(); engine.BeginOutputReadLine(); engine.BeginErrorReadLine();
        Task.Run(async () => {
            try {
                for(int i=0; i<300; i++) {
                    if(engine.HasExited) throw new Exception(Text("No se pudo iniciar la suite. El puerto puede estar ocupado. Consulta desktop.log.", "The suite could not start. The port may be in use. Check desktop.log."));
                    // Never open an unrelated server just because it occupies the same port.
                    string body = null;
                    try { var req=(HttpWebRequest)WebRequest.Create(url + "suite/status"); req.Timeout=500;
                        using(var response=req.GetResponse()) using(var reader=new StreamReader(response.GetResponseStream())) body=reader.ReadToEnd();
                    } catch(WebException) {}
                    if(body != null && body.Contains("\"desktopSession\":\"" + start.EnvironmentVariables["AB_SUITE_DESKTOP_SESSION"] + "\"")) {
                        Write("READY " + url);
                        if(!noBrowser) Open();
                        return;
                    }
                    await Task.Delay(200);
                }
                throw new Exception(Text("Tiempo de arranque agotado. Consulta desktop.log.", "Startup timed out. Check desktop.log."));
            } catch(Exception error) { Write(error.ToString()); if(!noBrowser) MessageBox.Show(error.Message, "AB Suite", MessageBoxButtons.OK, MessageBoxIcon.Error); quitSignal.Set(); }
        });
        Application.ApplicationExit += (s,e) => Stop();
    }
    void Stop() {
        if(stopping) return; stopping=true;
        try { if(engine != null && !engine.HasExited) {
            engine.StandardInput.WriteLine("shutdown"); engine.StandardInput.Flush();
            if(!engine.WaitForExit(12000)) {
                using(var kill=Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "taskkill.exe"), "/PID " + engine.Id + " /T /F") { UseShellExecute=false, CreateNoWindow=true })) kill.WaitForExit(5000);
            }
        }} catch(Exception error) { Write(error.Message); }
        if(tray != null) { tray.Visible=false; tray.Dispose(); }
        if(quitTimer != null) quitTimer.Dispose();
        if(quitSignal != null) quitSignal.Dispose();
        lock(logLock) { if(log != null) { log.Dispose(); log=null; } }
    }
    protected override void ExitThreadCore() { Stop(); base.ExitThreadCore(); }
    [STAThread] static void Main(string[] args) {
        bool owner;
        using(var mutex=new Mutex(true,"Local\\ABSuite.Desktop",out owner)) {
            if(!owner) {
                if(Array.IndexOf(args,"--quit") >= 0) { using(var signal=EventWaitHandle.OpenExisting("Local\\ABSuite.Quit")) signal.Set(); return; }
                var port=Environment.GetEnvironmentVariable("AB_SUITE_PORT")??"4170";
                Process.Start(new ProcessStartInfo("http://127.0.0.1:"+port+"/") { UseShellExecute=true }); return;
            }
            if(Array.IndexOf(args,"--quit") >= 0) return;
            Environment.SetEnvironmentVariable("AB_SUITE_DESKTOP_SESSION", Guid.NewGuid().ToString("N"));
            Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
            try { Application.Run(new SuiteHost(Array.IndexOf(args,"--no-browser") >= 0)); }
            catch(Exception error) { MessageBox.Show(error.Message,"AB Suite",MessageBoxButtons.OK,MessageBoxIcon.Error); }
        }
    }
}
