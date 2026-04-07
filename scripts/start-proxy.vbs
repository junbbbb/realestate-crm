Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\local-proxy.js""", 0, False
