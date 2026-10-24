#ifndef Payload
  #error Payload directory required
#endif
#ifndef AppVersion
  #define AppVersion "0.6.0"
#endif
[Setup]
AppId={{D71B8D3D-7C4D-49B6-AB09-4125ED5DD81E}
AppName=AB Suite
AppVersion={#AppVersion}
AppPublisher=MS ROBOTIKA
AppPublisherURL=https://github.com/msrobotika
DefaultDirName={localappdata}\Programs\AB Suite
DefaultGroupName=AB Suite
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputPath}
OutputBaseFilename=AB-Suite-{#AppVersion}-Windows-x64-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#Payload}\ab-suite.ico
UninstallDisplayIcon={app}\AB Suite.exe
CloseApplications=yes
RestartApplications=no
AppMutex=Local\ABSuite.Desktop
LicenseFile={#Payload}\app\LICENSE
DisableProgramGroupPage=yes
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
[CustomMessages]
english.DesktopShortcut=Create a desktop shortcut
spanish.DesktopShortcut=Crear un acceso directo en el escritorio
english.RunSuite=Open AB Suite
spanish.RunSuite=Abrir AB Suite
english.KeepData=Your projects and logs are kept in your local AB Suite data folder when uninstalling.
spanish.KeepData=Al desinstalar se conservan los proyectos y registros en tu carpeta local de datos de AB Suite.
[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopShortcut}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
[Files]
Source: "{#Payload}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\AB Suite"; Filename: "{app}\AB Suite.exe"; Parameters: "--language={language}"
Name: "{autodesktop}\AB Suite"; Filename: "{app}\AB Suite.exe"; Parameters: "--language={language}"; Tasks: desktopicon
Name: "{group}\{cm:UninstallProgram,AB Suite}"; Filename: "{uninstallexe}"
[Run]
Filename: "{app}\AB Suite.exe"; Parameters: "--language={language}"; Description: "{cm:RunSuite}"; Flags: nowait postinstall skipifsilent
