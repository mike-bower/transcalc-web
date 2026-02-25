unit Config;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  Forms, Dialogs, StdCtrls, Buttons, system.IOUtils, system.IniFiles;

const
  MAXTEXTLENGTH = 60;
  DISPLAYTRUE   = '1';
  DISPLAYFALSE  = '0';

type
  TXCalcConfigFrm = class(TForm)
    GroupBox1: TGroupBox;
    RB_US: TRadioButton;
    RB_Metric: TRadioButton;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    GroupBox2: TGroupBox;
    CKB_Display: TCheckBox;
    procedure BN_CancelClick(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
  private
    IniFile : tIniFile ;
    IniFileName : String ;
    procedure LoadSettings() ;
  public
    { Public declarations }
  end;

var
  XCalcConfigFrm: TXCalcConfigFrm;

implementation

{$R *.DFM}

procedure TXCalcConfigFrm.BN_CancelClick(Sender: TObject);
begin
  Close;
end;

procedure TXCalcConfigFrm.BN_OKClick(Sender: TObject);
begin
  if RB_Us.checked = true then begin
    IniFile.WriteString('Units', 'Units', 'US') ;
//    WritePrivateProfileString('Units', 'Units', 'US', PAnsiChar(IniFileName));
  end
  else begin
      IniFile.WriteString('Units', 'Units', 'Metric') ;
//  WritePrivateProfileString('Units', 'Units', 'Metric', PAnsiChar(IniFileName));
  end;
  if CkB_Display.checked = True then begin
      IniFile.WriteString('StartUp', 'Warning', DISPLAYTRUE) ;
//  WritePrivateProfileString('StartUp', 'Warning', DISPLAYTRUE, PAnsiChar(IniFileName));
  end
  else begin
      IniFile.WriteString('StartUp', 'Warning', DISPLAYFALSE) ;
//    WritePrivateProfileString('StartUp', 'Warning', DISPLAYFALSE, PAnsiChar(IniFileName));
  end;
end;

procedure TXCalcConfigFrm.FormCreate(Sender: TObject);
var

  IniPath : string ;

begin
   CreateDir(tPath.Combine(system.IOUtils.TPath.GetPublicPath,'Micro-Measurements')) ;
   IniPath := tPath.Combine( tPath.Combine(system.IOUtils.TPath.GetPublicPath(),'Micro-Measurements'),'xcalc') ;
   CreateDir(iniPath) ;
   IniFileName := tPath.Combine( IniPath, 'xcalc.ini') ;

   IniFile := tIniFile.Create(IniFileName);
   LoadSettings() ;
end;

procedure TXCalcConfigFrm.LoadSettings();
var
  Cs:string ;
//  Cs             : array[0..MAXTEXTLENGTH-1] of char;
  ShowTheMessage : integer;
begin
 {...getting Units from INI file}
   cs := IniFile.ReadString('Units', 'Units', 'US') ;
// GetPrivateProfileString('Units', 'Units', 'US', Cs, Sizeof(Cs), PWideChar(IniFileName));
  if cs = 'US' then
  begin
    RB_US.checked := true;
  end
  else begin
    RB_Metric.checked := true;
  end;
  ShowTheMessage := IniFile.ReadInteger('StartUp', 'Warning', 1);
  if ShowTheMessage = 1 then begin
    CKB_Display.checked := true;
  end
  else begin
    CKB_Display.checked := false;
  end;
end;

procedure TXCalcConfigFrm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(10000);
end;

end.
