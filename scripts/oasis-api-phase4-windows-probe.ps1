$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$stage = 'NATIVE_PROBE_SETUP_FAILED'
try {
    if (-not $env:OASIS_DIAGNOSTIC_ROOT -or [IO.Path]::GetFullPath((Get-Location).Path) -ne [IO.Path]::GetFullPath($env:OASIS_DIAGNOSTIC_ROOT)) { throw 'INVALID_ROOT' }
    $stage = 'NATIVE_PROBE_COMPILE_FAILED'
    Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class ProbeOpen { public bool ok; public uint error; }
public class ProbeInformation { public string name; public bool ok; public uint error; public long? value; }
public class ProbeToken { public ProbeOpen open; public ProbeInformation[] information; }
public class ProbeTokens { public ProbeToken process; public ProbeToken thread; }
public class ProbeFolder { public string name; public string guid; public uint flags = 0x4000; public string hTokenMode = "current-user"; public string hresult; public string path; }
public class ProbeReport {
    public int schemaVersion = 1; public string generatedAt; public int pid; public string createdAt;
    public int bitness; public ProbeFolder[] folders; public ProbeTokens tokens; public bool resourceCleanupComplete;
}
public static class OasisNativeProbe {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern int SHGetKnownFolderPath(ref Guid id, uint flags, IntPtr token, out IntPtr path);
    [DllImport("kernel32.dll", ExactSpelling = true)] private static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", ExactSpelling = true)] private static extern IntPtr GetCurrentThread();
    [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool OpenThreadToken(IntPtr thread, uint access, [MarshalAs(UnmanagedType.Bool)] bool openAsSelf, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool GetTokenInformation(IntPtr token, int informationClass, IntPtr buffer, uint size, out uint needed);
    private static bool cleaned = true;

    private static ProbeFolder Folder(string name, string guid) {
        ProbeFolder result = new ProbeFolder { name = name, guid = guid };
        IntPtr buffer = IntPtr.Zero;
        try {
            Guid id = new Guid(guid);
            int hr = SHGetKnownFolderPath(ref id, 0x4000, IntPtr.Zero, out buffer);
            result.hresult = "0x" + unchecked((uint)hr).ToString("X8");
            if (hr >= 0 && buffer != IntPtr.Zero) result.path = Marshal.PtrToStringUni(buffer);
        } finally { if (buffer != IntPtr.Zero) Marshal.FreeCoTaskMem(buffer); }
        return result;
    }
    private static ProbeInformation Information(IntPtr token, string name, int informationClass) {
        ProbeInformation result = new ProbeInformation { name = name };
        IntPtr buffer = IntPtr.Zero;
        try {
            uint size;
            bool first = GetTokenInformation(token, informationClass, IntPtr.Zero, 0, out size);
            uint firstError = first ? 0 : unchecked((uint)Marshal.GetLastWin32Error());
            if (first || firstError != 122 || size < 4 || size > 65536) { result.error = firstError == 0 ? 13 : firstError; return result; }
            buffer = Marshal.AllocHGlobal(checked((int)size));
            uint received;
            bool ok = GetTokenInformation(token, informationClass, buffer, size, out received);
            uint error = ok ? 0 : unchecked((uint)Marshal.GetLastWin32Error());
            if (!ok) { result.error = error; return result; }
            if (received < 4 || received > size) { result.error = 13; return result; }
            if (informationClass == 25) {
                if (received < IntPtr.Size + 4) { result.error = 13; return result; }
                IntPtr sid = Marshal.ReadIntPtr(buffer);
                long offset = sid.ToInt64() - buffer.ToInt64();
                if (offset < 0 || offset + 8 > received || Marshal.ReadByte(sid) != 1) { result.error = 13; return result; }
                int count = Marshal.ReadByte(sid, 1);
                if (count < 1 || count > 15 || offset + 8 + count * 4 > received) { result.error = 13; return result; }
                result.value = unchecked((uint)Marshal.ReadInt32(sid, 8 + (count - 1) * 4));
            } else result.value = unchecked((uint)Marshal.ReadInt32(buffer));
            result.ok = true;
        } catch { result.ok = false; result.value = null; result.error = 13; }
        finally { if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer); }
        return result;
    }
    private static ProbeToken Token(bool thread) {
        IntPtr token = IntPtr.Zero;
        ProbeToken result = new ProbeToken { open = new ProbeOpen(), information = new ProbeInformation[0] };
        try {
            bool ok = thread ? OpenThreadToken(GetCurrentThread(), 0x0008, true, out token) : OpenProcessToken(GetCurrentProcess(), 0x0008, out token);
            uint error = ok ? 0 : unchecked((uint)Marshal.GetLastWin32Error());
            result.open.ok = ok; result.open.error = error;
            if (ok) result.information = new ProbeInformation[] {
                Information(token, "TokenType", 8), Information(token, "TokenElevationType", 18),
                Information(token, "TokenIntegrityLevel", 25), Information(token, "TokenSessionId", 12), Information(token, "TokenIsAppContainer", 29)
            };
        } finally { if (token != IntPtr.Zero && !CloseHandle(token)) cleaned = false; }
        return result;
    }
    public static ProbeReport Collect() {
        cleaned = true;
        ProbeReport report = new ProbeReport();
        using (Process self = Process.GetCurrentProcess()) {
            report.pid = self.Id; report.createdAt = self.StartTime.ToUniversalTime().ToString("o");
        }
        report.bitness = IntPtr.Size * 8;
        report.folders = new ProbeFolder[] {
            Folder("LocalAppData", "F1B32785-6FBA-4FCF-9D55-7B8E7F157091"),
            Folder("RoamingAppData", "3EB685DB-65F9-4CF6-A03A-E3EF65729F3D"),
            Folder("Profile", "5E6C858F-0E22-4760-9AFE-EA3317B67173"),
            Folder("ProgramData", "62AB5D82-FDC1-4DC3-A9DD-070D1D495D97")
        };
        report.tokens = new ProbeTokens { process = Token(false), thread = Token(true) };
        report.resourceCleanupComplete = cleaned;
        report.generatedAt = DateTime.UtcNow.ToString("o");
        return report;
    }
}
'@
    $stage = 'NATIVE_PROBE_CALL_FAILED'
    $report = [OasisNativeProbe]::Collect()
    $json = ConvertTo-Json -InputObject $report -Depth 8 -Compress
    if ([Text.Encoding]::UTF8.GetByteCount($json) -gt 65536) { throw 'OUTPUT_LIMIT' }
    [Console]::Out.WriteLine($json)
    if (-not $report.resourceCleanupComplete) { exit 1 }
} catch {
    [Console]::Error.WriteLine($stage)
    exit 1
}
