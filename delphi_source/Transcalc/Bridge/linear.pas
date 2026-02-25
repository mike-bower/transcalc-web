(************************************************)
(*   Linear Poisson Bridge Unit                 *)
(************************************************)
unit Linear;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, Printers
  {, acStream, acList, Log, LogItem, LogStrm};

const
  MAXTEXTLENGTH  = 40;
  MAXERRORLENGTH = 255;

type
  RealType = double;

(************************************************)
(*   TLinearPoisson Bridge Object               *)
(************************************************)
(*
type TLinearPoisson = class(TLogItem)
private
  FStrain          : string;
  FGageFactor      : string;
  FPoisson         : string;
  FOutput          : string;
  TheString        : string;
protected
  procedure AssignTo(Dest: TPersistent); override;
  procedure InitFields; override;
  procedure SaveToStream(Stream : TacObjStream); override;
  procedure ReadFromStream(Stream: TacObjStream); override;
  procedure ShowTheForm; override;
  function GetAsString: String; override;
public
  constructor create;
  destructor destroy;
  property Strain: string read FStrain write FStrain;
  property GageFactor: string read FGageFactor write FGageFactor;
  property Poisson: string read FPoisson write FPoisson;
  property BridgeOutput: string read FOutput write FOutput;
  property TheStringText: string read TheString write TheString;
end;
*)

(************************************************)
(*   TLinearPoisson Form  Object                *)
(************************************************)
type
  TLinearPoissonForm = class(TForm)
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    BN_Compute: TBitBtn;
    Panel1: TPanel;
    Image1: TImage;
    Panel2: TPanel;
    GroupBox1: TGroupBox;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    EB_Strain: TEdit;
    EB_GageFactor: TEdit;
    EB_Poisson: TEdit;
    Label4: TLabel;
    Panel3: TPanel;
    GroupBox2: TGroupBox;
    ST_Output: TLabel;
    Label6: TLabel;
    Label5: TLabel;
    BN_Print: TBitBtn;
    procedure BN_ComputeClick(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    function CalculateOutput: RealType;
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure BN_PrintClick(Sender: TObject);
  private
    Old_Strain          : string;
    Old_GageFactor      : string;
    Old_Poisson         : string;
    Old_Output          : string;
    TheOutput           : string;
    ExceptionRaised     : boolean;
    IsThereAnError      : boolean;
    TheStrain           : RealType;
    TheGageFactor       : RealType;
    ThePoisson          : RealType;
    OutputValue         : RealType;
    function GotFormImage: TBitmap;
    procedure PrintForm;
  public
{   LinearPoissonObject  : TLinearPoisson;}
    LinearPoissonChosen  : boolean;
  end;

var
  LinearPoissonForm: TLinearPoissonForm;

implementation
uses {MainMenu,} Bridge, Convert;

{$R *.DFM}

(***********************************************)
(*  Linear Poisson Object Methods              *)
(***********************************************)

(***********************************************************************)
{TLinearPoisson.create}
(*
constructor TLinearPoisson.create;
begin
  {...creating the object}
  inherited create;
  {...setting the objects stream so know what kind of object it is when save}
  TheString := '2 + 2v Arms, Bending'
end;
*)

(***********************************************************************)
{TLinearPoisson.destroy}
(*
destructor TLinearPoisson.destroy;
begin
  {...destroying object}
  inherited destroy;
end;
*)

(***********************************************************************)
{TLinearPoisson.GetAsString}
(*
function TLinearPoisson.GetAsString: string;
begin
  Result := TheString;
end;
*)

(***********************************************************************)
{TLinearPoisson.ShowTheForm}
(*
procedure TLinearPoisson.ShowTheForm;
begin
  Application.CreateForm(TLinearPoissonForm, LinearPoissonForm);
  LinearPoissonForm.showmodal;
end;
*)

(***********************************************************************)
{TLinearPoisson.AssignTo}
(*
procedure TLinearPoisson.AssignTo(Dest: TPersistent);
begin
  if (Dest is TLinearPoisson) and (Self is Dest.ClassType) then begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TLinearPoisson do begin
      FStrain := self.FStrain;
      FGageFactor := self.FGageFactor;
      FPoisson := self.FPoisson;
      FOutput := self.FOutput;
      TheString := self.TheString;
    end;
  end
  else begin
    inherited AssignTo(Dest);
  end;
end;
*)

(***********************************************************************)
{TLinearPoisson.InitFields}
(*
procedure TLinearPoisson.InitFields;
begin
  inherited InitFields;
end;
*)

(***********************************************************************)
{TLinearPoisson.SaveToStream}
(*
procedure TLinearPoisson.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FStrain, sizeof(string));
  Stream.SaveBuffer(FGageFactor, sizeof(string));
  Stream.SaveBuffer(FPoisson, sizeof(string));
  Stream.SaveBuffer(FOutput, sizeof(string));
  Stream.SaveBuffer(TheString, sizeof(string));
end;
*)

(***********************************************************************)
{TLinearPoisson.ReadFromStream}
(*
procedure TLinearPoisson.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FStrain, sizeof(string));
  Stream.ReadBuffer(FGageFactor, sizeof(string));
  Stream.ReadBuffer(FPoisson, sizeof(string));
  Stream.ReadBuffer(FOutput, sizeof(string));
  Stream.ReadBuffer(TheString, sizeof(string));
end;
*)

(***********************************************)
(*  Linear Poisson Form Methods                *)
(***********************************************)

(***********************************************************************)
{TLinearPoissonForm.CalculateOutput}
function TLinearPoissonForm.CalculateOutput: RealType;
var
  ErrorMsg         : array[0..MAXERRORLENGTH] of char;
  ErrorCaption     : array[0..MAXERRORLENGTH] of char;
  Numerator        : RealType;
  Denominator      : RealType;
  OutValue         : RealType;
  Button           : integer;
begin
  ExceptionRaised := false;
  try
    Numerator := TheStrain * TheGageFactor * (1 + ThePoisson) * 1e-3;
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoBridgeOutput, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
      EB_Strain.setfocus;
      exit;
    end;
  end;
  try
    Denominator := 2;
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoBridgeOutput, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
      EB_Strain.setfocus;
      exit;
    end;
  end;
  try
    OutValue := (Numerator/Denominator);
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoBridgeOutput, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
      EB_Strain.setfocus;
      exit;
    end;
  end;
  CalculateOutput := OutValue;
end;

(***********************************************************************)
{TLinearPoissonForm.BN_ComputeClick}
procedure TLinearPoissonForm.BN_ComputeClick(Sender: TObject);
const
  MINSTRAIN     = -5000;
  MAXSTRAIN     = 5000;
  MINGAGEFACTOR = 1.00;
  MAXGAGEFACTOR = 5.00;
  MINPOISSON    = 0.01;
  MAXPOISSON    = 0.5;
var
  ErrorMsg         : array[0..MAXERRORLENGTH] of char;
  ErrorUnit        : array[0..MAXERRORLENGTH] of char;
  ErrorAnd         : array[0..MAXERRORLENGTH] of char;
  ErrorCaption     : array[0..MAXERRORLENGTH] of char;
  StrUnit          : string;
  StrAnd           : string;
  StrMsg           : string;
  StrMin           : string;
  strMax           : string;
  EditStrings      : string;
  ErrorCode        : integer;
  Button           : integer;
begin
  ST_Output.caption := '';
  IsThereAnError := false;
  {...checking Strain to make sure valid}
  EditStrings := EB_Strain.text;
  StrVal(EditStrings, TheStrain, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Strain.setfocus;
    EB_Strain.clearselection;
    exit;
  end
  else if (TheStrain < MINSTRAIN) or (TheStrain > MAXSTRAIN) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_StrainUnit, ErrorUnit, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_Strain, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINSTRAIN, ffFixed, 8, 0);
    StrMax := floattostrf(MAXSTRAIN, ffFixed, 8, 0);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Strain.setfocus;
    EB_Strain.clearselection;
    exit;
  end;
  {...checking Gage Factor to make sure valid}
  EditStrings := EB_GageFactor.text;
  StrVal(EditStrings, TheGageFactor, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end
  else if (TheGageFactor < MINGAGEFACTOR) or (TheGageFactor > MAXGAGEFACTOR) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_GageFactor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINGAGEFACTOR, ffFixed, 8, 1);
    StrMax := floattostrf(MAXGAGEFACTOR, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end;
  {...checking to see if Poisson is valid}
  EditStrings := EB_Poisson.text;
  StrVal(EditStrings, ThePoisson, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Poisson.setfocus;
    EB_Poisson.clearselection;
    exit;
  end
  else if (ThePoisson < MINPOISSON) or (ThePoisson > MAXPOISSON) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_Poisson, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINPOISSON, ffFixed, 8, 3);
    StrMax := floattostrf(MAXPOISSON, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax ;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Poisson.setfocus;
    EB_Poisson.clearselection;
    exit;
  end;
  OutputValue := CalculateOutput;
  if ExceptionRaised = false then begin
    TheOutput := floattostrf(abs(OutputValue), ffFixed, 6, 3);
    ST_Output.caption := TheOutput;
  end;
end;

(***********************************************************************)
{TLinearPoissonForm.BN_CancelClick}
procedure TLinearPoissonForm.BN_CancelClick(Sender: TObject);
begin
  {...placing old data in edit boxes}
  EB_Strain.text := Old_Strain;
  EB_GageFactor.text := Old_GageFactor;
  EB_Poisson.text := Old_Poisson;
  ST_Output.caption := Old_Output;
  if LinearPoissonChosen = false then begin
    LinearPoissonChosen := false;
    {MainForm.Bridge1.enabled := true;}
  end;
  close;
end;

(***********************************************************************)
{TLinearPoissonForm.FormCreate}
procedure TLinearPoissonForm.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(***********************************************************************)
{TLinearPoissonForm.FormActivate}
procedure TLinearPoissonForm.FormActivate(Sender: TObject);
var
  EditStrings  : string;
  i            : integer;
 { TheItem      : TacStreamable;}
begin
  {getting item from object if there is one}
(*
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TLinearPoisson then begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.Flog.Count);
  {...if there is an object, then placing data in edit boxes}
  if TheItem <> nil then begin
    EB_Strain.text := (TheItem as TLinearPoisson).Strain;
    EB_GageFactor.text := (TheItem as TLinearPoisson).GageFactor;
    EB_Poisson.text := (TheItem as TLinearPoisson).Poisson;
    ST_Output.caption := (TheItem as TLinearPoisson).BridgeOutput;
  end;
*)
  {...placing original edit box data in old variables in case cancel clicked}
  Old_Strain := EB_Strain.text;
  Old_GageFactor := EB_GageFactor.text;
  Old_Poisson := EB_Poisson.text;
  Old_Output := ST_Output.caption;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(***********************************************************************)
{TLinearPoissonForm.BN_OKClick}
procedure TLinearPoissonForm.BN_OKClick(Sender: TObject);
(*
var
  TheItem : TACStreamable;
  i : integer;
  j : integer;
*)
begin
  LinearPoissonChosen := true;
  BN_ComputeClick(Sender);
  if IsThereAnError = True then begin
    exit;
  end;
(*
  MainForm.Bridge1.enabled := true;
  {getting item from object if there is one}
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TLinearPoisson then begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.Flog.Count);
  {...if there is an object, then placing data in edit boxes}
  if TheItem = nil then begin
    {...placing data in object}
    LinearPoissonObject := TLinearPoisson.create;
    LinearPoissonObject.Strain := EB_Strain.text;
    LinearPoissonObject.GageFactor := EB_GageFactor.text;
    LinearPoissonObject.Poisson := EB_Poisson.text;
    LinearPoissonObject.BridgeOutput := ST_Output.caption;
    MainForm.AddToLog(LinearPoissonObject);
    j := 0;
    {...placing object string in the outline}
    repeat
      inc(j);
    until (MainForm.XCalcOutline.Items[j].text = 'Bridge Configurations') or (j > MainForm.XCalcOutline.ItemCount);
    MainForm.XCalcOutline.AddChild(j, LinearPoissonObject.GetAsString);
  end
  else begin
    (TheItem as TLinearPoisson).Strain := EB_Strain.text;
    (TheItem as TLinearPoisson).GageFactor := EB_GageFactor.text;
    (TheItem as TLinearPoisson).Poisson := EB_Poisson.text;
    (TheItem as TLinearPoisson).BridgeOutput := ST_Output.caption;
  end;
  MainForm.IsDirty := true;
 *)
  close;
 (*
  if BridgeDlg.BridgeDlgShowing = true then begin
    BridgeDlg.close;
  end;
  *)
end;

procedure TLinearPoissonForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(*
begin
  {...registering object}
  RegisterClasses([TLinearPoisson]);
*)

procedure TLinearPoissonForm.BN_PrintClick(Sender: TObject);
begin
  BN_Compute.visible := false;
  BN_OK.visible := false;
  BN_Cancel.visible := false;
  BN_Print.visible := false;
  PrintForm;
  BN_Compute.visible := true;
  BN_OK.visible := true;
  BN_Cancel.visible := true;
  BN_Print.visible := true;
end;

{TLinearPoissonForm.GotFormImage}
function TLinearPoissonForm.GotFormImage: TBitmap;
var
  ScreenDC, PrintDC: HDC;
  OldBits, PrintBits: HBITMAP;
  PaintLParam: Longint;

  procedure PrintHandle(Handle: HWND);
  var
    R: TRect;
    Child: HWND;
    SavedIndex: Integer;
  begin
    if {IsWindowVisible(Handle)} true then
    begin
      SavedIndex := SaveDC(PrintDC);
      WinProcs.GetClientRect(Handle, R);
      MapWindowPoints(Handle, Self.Handle, R, 2);
      with R do
      begin
        SetWindowOrgEx(PrintDC, -Left, -Top, nil);
        IntersectClipRect(PrintDC, 0, 0, Right - Left, Bottom - Top);
      end;
      SendMessage(Handle, WM_ERASEBKGND, PrintDC, 0);
      SendMessage(Handle, WM_PAINT, PrintDC, PaintLParam);
      Child := GetWindow(Handle, GW_CHILD);
      if Child <> 0 then
      begin
        Child := GetWindow(Child, GW_HWNDLAST);
        while Child <> 0 do
        begin
          PrintHandle(Child);
          Child := GetWindow(Child, GW_HWNDPREV);
        end;
      end;
      RestoreDC(PrintDC, SavedIndex);
    end;
  end;

begin
  Result := nil;
  ScreenDC := GetDC(0);
  PaintLParam := 0;
  try
    PrintDC := CreateCompatibleDC(ScreenDC);
    { Work around an apparent bug in Windows NT }
 //   if GetWinFlags and $4000 <> 0 then PaintLParam := PrintDC or $DEFE0000;
    try
      PrintBits := CreateCompatibleBitmap(ScreenDC, ClientWidth, ClientHeight);
      try
        OldBits := SelectObject(PrintDC, PrintBits);
        try
          { Clear the contents of the bitmap }
          FillRect(PrintDC, ClientRect, Brush.Handle);
          { Paint form into a bitmap }
          PrintHandle(Handle);
        finally
          SelectObject(PrintDC, OldBits);
        end;
        Result := TBitmap.Create;
        Result.Handle := PrintBits;
        PrintBits := 0;
      except
        Result.Free;
        if PrintBits <> 0 then DeleteObject(PrintBits);
        raise;
      end;
    finally
      DeleteDC(PrintDC);
    end;
  finally
    ReleaseDC(0, ScreenDC);
  end;
end;

(***********************************************************************)
{TLinearPoissonForm.PrintForm}
procedure TLinearPoissonForm.PrintForm;
var
  FormImage: TBitmap;
  Info: PBitmapInfo;
  InfoSize: Cardinal;
  Image: Pointer;
  ImageSize: Cardinal;
  Bits: HBITMAP;
  DIBWidth, DIBHeight: Longint;
  PrintWidth, PrintHeight: Longint;
begin
  Printer.BeginDoc;
  try
    FormImage := GotFormImage;
    try
      { Paint bitmap to the printer }
      with Printer, Canvas do
      begin
        Bits := FormImage.Handle;
        GetDIBSizes(Bits, InfoSize, ImageSize);
        Info := AllocMem(InfoSize);
        try
          Image := AllocMem(ImageSize);
          try
            GetDIB(Bits, 0, Info^, Image^);
            with Info^.bmiHeader do
            begin
              DIBWidth := biWidth;
              DIBHeight := biHeight;
            end;
            {case PrintScale of
              poProportional:
                begin
                  PrintWidth := MulDiv(DIBWidth, GetDeviceCaps(Handle,
                    LOGPIXELSX), PixelsPerInch);
                  PrintHeight := MulDiv(DIBHeight, GetDeviceCaps(Handle,
                    LOGPIXELSY), PixelsPerInch);
                end;
              poPrintToFit:
                begin
             }     PrintWidth := MulDiv(DIBWidth, PageHeight, DIBHeight);
                  if PrintWidth < PageWidth then
                    PrintHeight := PageHeight
                  else
                  begin
                    PrintWidth := PageWidth;
                    PrintHeight := MulDiv(DIBHeight, PageWidth, DIBWidth);
                  end;
                {end;
            else
              PrintWidth := DIBWidth;
              PrintHeight := DIBHeight;
            end;}
            StretchDIBits(Canvas.Handle, 0, 0, PrintWidth, PrintHeight, 0, 0,
              DIBWidth, DIBHeight, Image, Info^, DIB_RGB_COLORS, SRCCOPY);
          finally
            FreeMem(Image, ImageSize);
          end;
        finally
          FreeMem(Info, InfoSize);
        end;
      end;
    finally
      FormImage.Free;
    end;
  finally
    Printer.EndDoc;
  end;
end;

end.

