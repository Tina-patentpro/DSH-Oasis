$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$stage = 'PARITY_PROBE_SETUP_FAILED'
try {
    if (-not $env:OASIS_PATH_PARITY_ROOT -or [IO.Path]::GetFullPath((Get-Location).Path) -ne [IO.Path]::GetFullPath($env:OASIS_PATH_PARITY_ROOT)) { throw 'ROOT_MISMATCH' }
    $stage = 'PARITY_PROBE_COMPILE_FAILED'
    Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class ParityCall {
    public string id; public string api; public string guid; public int? csidl; public uint flags;
    public string hTokenMode = "current-user"; public string hwndMode;
    public string at; public string status = "executed"; public string hresult; public string path; public string guardCode;
}
public class ParityReport {
    public int schemaVersion = 1; public string kind = "path-api-contract-parity";
    public string generatedAt; public int pid; public string createdAt; public int bitness;
    public ParityCall[] calls; public bool resourceCleanupComplete;
}
public static class OasisPathParity {
    private const string FolderId = "F1B32785-6FBA-4FCF-9D55-7B8E7F157091";
    private static string root;
    private static bool cleaned;
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern int SHGetKnownFolderPath(ref Guid id, uint flags, IntPtr token, out IntPtr path);
    [DllImport("shell32.dll", EntryPoint = "SHGetFolderPathW", CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern int FolderPath(IntPtr hwnd, int csidl, IntPtr token, uint flags, [Out] StringBuilder path);

    private static ParityCall Contract(int index) {
        if (index == 1) return new ParityCall { id = "legacy-current", api = "SHGetFolderPathW", csidl = 0x001c, flags = 0, hwndMode = "null" };
        return new ParityCall { id = index == 0 ? "known-dont-verify" : "known-verify", api = "SHGetKnownFolderPath", guid = FolderId, flags = index == 0 ? 0x4000u : 0u };
    }
    private static ParityCall Known(int index) {
        ParityCall result = Contract(index);
        IntPtr buffer = IntPtr.Zero;
        try {
            Guid id = new Guid(FolderId);
            result.at = DateTime.UtcNow.ToString("o");
            int hr = SHGetKnownFolderPath(ref id, result.flags, IntPtr.Zero, out buffer);
            result.hresult = "0x" + unchecked((uint)hr).ToString("X8");
            if (hr == 0 && buffer != IntPtr.Zero) result.path = Marshal.PtrToStringUni(buffer);
        } finally {
            if (buffer != IntPtr.Zero) {
                try { Marshal.FreeCoTaskMem(buffer); } catch { cleaned = false; }
            }
        }
        return result;
    }
    private static ParityCall Legacy() {
        ParityCall result = Contract(1);
        StringBuilder buffer = new StringBuilder(260);
        result.at = DateTime.UtcNow.ToString("o");
        int hr = FolderPath(IntPtr.Zero, 0x001c, IntPtr.Zero, 0, buffer);
        result.hresult = "0x" + unchecked((uint)hr).ToString("X8");
        if (hr == 0) result.path = buffer.ToString();
        return result;
    }
    private static ParityCall Skip(int index, string code) {
        ParityCall result = Contract(index);
        result.status = "skipped-safety-guard"; result.guardCode = code;
        return result;
    }
    private static string MissingPathGuard(string item) {
        if (String.Equals(item, root, StringComparison.OrdinalIgnoreCase) ||
            String.Equals(item, Path.Combine(root, "os-home"), StringComparison.OrdinalIgnoreCase)) return "PATH_METADATA_UNAVAILABLE";
        return null;
    }
    private static string GuardPath(string returned) {
        if (String.IsNullOrEmpty(returned) || returned.Length > 32767 || returned.Length < 3 ||
            !Char.IsLetter(returned[0]) || returned[1] != ':' || (returned[2] != '\\' && returned[2] != '/')) return "PATH_OUTSIDE_SCOPE";
        foreach (char c in returned) if (c < 32 || c == '%') return "PATH_OUTSIDE_SCOPE";
        string path;
        try { path = Path.GetFullPath(returned); } catch { return "PATH_OUTSIDE_SCOPE"; }
        string expected = Path.Combine(root, "os-home", "AppData", "Local");
        if (!String.Equals(path, expected, StringComparison.OrdinalIgnoreCase)) return "PATH_OUTSIDE_SCOPE";
        // Only inspect root and descendants; never follow a discovered reparse point.
        List<string> ancestors = new List<string>();
        string cursor = path;
        while (!String.Equals(cursor, root, StringComparison.OrdinalIgnoreCase)) {
            ancestors.Insert(0, cursor);
            DirectoryInfo parent = Directory.GetParent(cursor);
            if (parent == null) return "PATH_OUTSIDE_SCOPE";
            cursor = parent.FullName;
        }
        ancestors.Insert(0, root);
        foreach (string item in ancestors) {
            try {
                FileAttributes attributes = File.GetAttributes(item);
                if ((attributes & FileAttributes.ReparsePoint) != 0) return "PATH_REPARSE_REJECTED";
                if ((attributes & FileAttributes.Directory) == 0) return "PATH_METADATA_UNAVAILABLE";
            } catch (FileNotFoundException) { return MissingPathGuard(item); }
              catch (DirectoryNotFoundException) { return MissingPathGuard(item); }
              catch { return "PATH_METADATA_UNAVAILABLE"; }
        }
        return null;
    }
    public static ParityReport Collect(string isolatedRoot) {
        root = Path.GetFullPath(isolatedRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        cleaned = true;
        ParityReport report = new ParityReport { bitness = IntPtr.Size * 8, calls = new ParityCall[3] };
        using (Process self = Process.GetCurrentProcess()) {
            report.pid = self.Id; report.createdAt = self.StartTime.ToUniversalTime().ToString("o");
        }
        ParityCall[] calls = report.calls;
        ParityCall first = Known(0); calls[0] = first;
        first.guardCode = first.hresult == "0x00000000" ? GuardPath(first.path) : "FIRST_CALL_FAILED";
        if (first.guardCode != null) {
            calls[1] = Skip(1, first.guardCode); calls[2] = Skip(2, first.guardCode);
        } else {
            calls[1] = Legacy();
            if (calls[1].hresult == "0x00000000") calls[1].guardCode = GuardPath(calls[1].path);
            if (calls[1].guardCode != null) calls[2] = Skip(2, calls[1].guardCode);
            else {
                calls[2] = Known(2);
                if (calls[2].hresult == "0x00000000") calls[2].guardCode = GuardPath(calls[2].path);
            }
        }
        report.resourceCleanupComplete = cleaned;
        report.generatedAt = DateTime.UtcNow.ToString("o");
        return report;
    }
}
'@
    $stage = 'PARITY_PROBE_CALL_FAILED'
    $report = [OasisPathParity]::Collect($env:OASIS_PATH_PARITY_ROOT)
    $json = ConvertTo-Json -InputObject $report -Depth 6 -Compress
    if ([Text.Encoding]::UTF8.GetByteCount($json) -gt 65536) { throw 'OUTPUT_LIMIT' }
    [Console]::Out.WriteLine($json)
    if (-not $report.resourceCleanupComplete -or @($report.calls | Where-Object { $_.guardCode }).Count -gt 0) { exit 1 }
} catch {
    [Console]::Error.WriteLine($stage)
    exit 1
}
