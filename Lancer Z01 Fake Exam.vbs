Option Explicit
Dim shell, files, root, command, result
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
On Error Resume Next
command = "pyw -3 """ & root & "\scripts\launcher_gui.py"""
result = shell.Run(command, 0, False)
If Err.Number <> 0 Then
  Err.Clear
  command = "pythonw """ & root & "\scripts\launcher_gui.py"""
  result = shell.Run(command, 0, False)
  If Err.Number <> 0 Then
    MsgBox "Python 3 est introuvable. Installe Python 3 puis relance le lanceur.", 48, "Z01 Fake Exam"
  End If
End If
