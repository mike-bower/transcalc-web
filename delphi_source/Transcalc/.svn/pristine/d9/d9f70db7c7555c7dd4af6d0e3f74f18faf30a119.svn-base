unit Register;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

const
  MAXTEXTLENGTH = 80;
  MAXERRORLENGTH = 255;
  MAXDIRLENGTH = 45;

type
  TRegisterForm = class(TForm)
    ST_CodeNum: TLabel;
    Label3: TLabel;
    ST_ComputerNum: TLabel;
    Label5: TLabel;
    EB_UnlockCode: TEdit;
    BN_Register: TBitBtn;
    Bevel1: TBevel;
    Bevel2: TBevel;
    BN_Cancel: TBitBtn;
    Label1: TLabel;
    procedure BN_RegisterClick(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
  public
    TheCode        : LongInt;
    ThisComputer   : LongInt;
  end;

var
  RegisterForm: TRegisterForm;

implementation
uses IniFiles, ppp_decl, MainMenu;

var
  TheIniFile: TIniFile;

{$R *.DFM}

procedure TRegisterForm.BN_RegisterClick(Sender: TObject);
const
  EXPTIME = 10;
var
  Msg           : array[0..MAXERRORLENGTH-1] of char;
  BoxCaption    : array[0..MAXERRORLENGTH-1] of char;
  WindowsBuffer : array[0..MAXDIRLENGTH-1] of char;
  WindowsString : string;
  UnlockCode    : LongInt;
  TheResult     : LongInt;
  Button        : integer;
  exp_month     : integer;
  exp_day       : integer;
  exp_year      : integer;
begin
  UnlockCode := StrtoInt(EB_UnlockCode.text);
  {...check if code is OK}
  TheResult := pp_ucode(UnlockCode, TheCode, ThisComputer);
  if TheResult <> 0 then begin
    {set unlock type to 'N'}
    LoadString(hinstance, ID_SZ_Success, Msg, sizeof(Msg));
    LoadString(hinstance, ID_SZ_SuccessCaption, BoxCaption, sizeof(BoxCaption));
    Button := Application.MessageBox(Msg, BoxCaption, mb_OK or MB_ICONEXCLAMATION);
    GetWindowsDirectory(WindowsBuffer, sizeof(WindowsBuffer));
    WindowsString := strpas(WindowsBuffer);
    WindowsString := WindowsString + '\comp.cf';
    strpCopy(WindowsBuffer, WindowsString);
    MainForm.IllegalUse := false;
    pp_unlock;
    pp_writecf(WindowsBuffer);
    close;
  end
  else begin
    LoadString(hinstance, ID_SZ_UnSuccess, Msg, sizeof(Msg));
    LoadString(hinstance, ID_SZ_UnSuccessCaption, BoxCaption, sizeof(BoxCaption));
    Button := Application.MessageBox(Msg, BoxCaption, mb_OK or MB_ICONEXCLAMATION);
    close;
  end;
end;

procedure TRegisterForm.FormShow(Sender: TObject);
var
  Msg       : array[0..12] of char;
  ErrorCode : integer;
begin
  {...get the code number from the ini file}
  pp_GetVarChar(VAR_SERIAL, Msg);
  ST_CodeNum.Caption := Msg;
  val(Msg, TheCode, ErrorCode);
  ThisComputer := pp_compno(1, '', 0);
  ST_ComputerNum.Caption := IntToStr(ThisComputer);
end;

procedure TRegisterForm.BN_CancelClick(Sender: TObject);
begin
  close;
end;

procedure TRegisterForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

end.
