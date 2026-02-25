(* ********************************************** *)
(* Cut D01 3 pt. Unit *)
(* ********************************************** *)
unit D013pt;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, acList, acStream, Log, LogItem,
  LogStrm, Dialogs, Printers;

type
  RealType = double;

  (* ********************************************** *)
  (* TRung Object *)
  (* ********************************************** *)
type
  TRung = class(TLogItem)
  private
    CuttingArea: TRect;
  public
    RungIsCut: Boolean;
    constructor create(left, top, right, bottom: integer);
    destructor done; virtual;
    function IsClicked(p: TPoint): Boolean;
    procedure Cut(TheCanvas: TCanvas);
    function IsCut: integer;
    procedure Fix(TheCanvas: TCanvas);
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
    procedure Redraw(TheCanvas: TCanvas);
  end;

  (* ********************************************** *)
  (* TD01 Resistor Object *)
  (* ********************************************** *)
type
  TD013ptResistor = class(TLogItem)
  private
    FStartResistance: shortstring;
    TheString: shortstring;
  protected
    procedure AssignTo(Dest: TPersistent); override;
    procedure ShowTheForm; override;
    function GetAsString: string; override;
    procedure InitFields; override;
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
  public
    { property and functions here }
    FA1, FA2, FA3, FA4, FA5, FA6, FA7: TRung;
    FB1, FB2, FB3, FB4, FB5, FB6, FB7, FB8, FB9: TRung;
    FC1, FC2, FC3, FC4, FC5, FC6, FC7: TRung;
    constructor create;
    destructor destroy; override;
    property StartResistance: shortstring read FStartResistance
      write FStartResistance;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************** *)
  (* TCut D01 Form Object *)
  (* ********************************************** *)
type
  TCutD013PointFrm = class(TForm)
    Image1: TImage;
    Label1: TLabel;
    Label3: TLabel;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    BN_Restore: TBitBtn;
    BN_Help: TBitBtn;
    BN_Print: TBitBtn;
    GroupBox1: TGroupBox;
    Label4: TLabel;
    EB_StartingRes: TEdit;
    GroupBox2: TGroupBox;
    ST_CalculatedRes: TLabel;
    Label7: TLabel;
    procedure Image1MouseDown(Sender: TObject; Button: TMouseButton;
      Shift: TShiftState; X, Y: integer);
    procedure FormCreate(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure BN_RestoreClick(Sender: TObject);
    procedure ReCalculate;
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure PrintForm;
    function GotFormImage: TBitmap;
    procedure BN_PrintClick(Sender: TObject);
    procedure EB_StartingResExit(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
  public
    D013ptResistor: TD013ptResistor;
  end;

var
  CutD013PointFrm: TCutD013PointFrm;

implementation

uses mainmenu, convert;
{$R *.DFM}

(* ********************************************* *)
(* TRung Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TRung.create }
constructor TRung.create(left, top, right, bottom: integer);
begin
  inherited create;
  { ...creating the TRung object setting the cutting area and intializing RungIsCut }
  RungIsCut := false;
  CuttingArea.left := left;
  CuttingArea.top := top;
  CuttingArea.right := right;
  CuttingArea.bottom := bottom;
end;

(* ********************************************************************* *)
{ TRung.done }
destructor TRung.done;
begin
  { ...destroying the object }
  done;
end;

(* ********************************************************************* *)
{ TRung.Redraw }
procedure TRung.Redraw(TheCanvas: TCanvas);
begin
  { ..deciding whether to cut or fix the rung depending on whether it was fixed or cut }
  with TheCanvas do
  begin
    if RungIsCut = false then
    begin { ...we need to restore the rung }
      pen.Color := clGray;
      brush.Color := clGray;
    end
    else
    begin { ...we need to cut rung }
      pen.Color := clYellow;
      brush.Color := clYellow;
    end;
    { ...setting pen and  brush attributes }
    brush.Style := bsSolid;
    pen.Style := psSolid;
    Rectangle(CuttingArea.left, CuttingArea.top, CuttingArea.right,
      CuttingArea.bottom);
  end;
end;

(* ********************************************************************* *)
{ TRung.SaveToStream }
procedure TRung.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveTRect(CuttingArea);
  Stream.SaveBuffer(RungIsCut, sizeof(Boolean));
end;

(* ********************************************************************* *)
{ TRung.ReadFromStream }
procedure TRung.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadTRect(CuttingArea);
  Stream.ReadBuffer(RungIsCut, sizeof(Boolean));
end;

(* ********************************************************************* *)
{ TRung.IsClicked }
function TRung.IsClicked(p: TPoint): Boolean;
begin
  { ...determines if the point clicked is in which rectangle }
  Result := PtInRect(CuttingArea, p);
end;

(* ********************************************************************* *)
{ TRung.IsCut }
function TRung.IsCut: integer;
begin
  if RungIsCut then
  begin
    IsCut := 0;
  end
  else
  begin
    IsCut := 1;
  end;
end;

(* ********************************************************************* *)
{ TRung.Cut }
procedure TRung.Cut(TheCanvas: TCanvas);
begin
  { ...setting the RungIsCut Value }
  RungIsCut := true;
  { ...Cutting the rung }
  Redraw(TheCanvas);
end;

(* ********************************************************************* *)
{ TRung.Fix }
procedure TRung.Fix(TheCanvas: TCanvas);
begin
  { ...setting RungIsCut }
  RungIsCut := false;
  { ...fixing the rung }
  Redraw(TheCanvas);
end;

(* ********************************************* *)
(* TD013ptResistor Methods *)
(* ********************************************* *)
(* ********************************************************************* *)
{ TD013ptResistor.create }
constructor TD013ptResistor.create;
begin
  inherited create;
  { ...setting the string so can identify which object it is }
  TheString := 'D01 Resistor (Span vs. Temp 3pt.)';
  { ...setting the cutting area of each rung }
  FA7 := TRung.create(70, 177, 81, 187);
  FA6 := TRung.create(70, 155, 81, 164);
  FA5 := TRung.create(70, 132, 81, 141);
  FA4 := TRung.create(70, 109, 81, 118);
  FA3 := TRung.create(70, 87, 81, 96);
  FA2 := TRung.create(70, 66, 81, 75);
  FA1 := TRung.create(70, 45, 81, 54);
  FB9 := TRung.create(109, 177, 119, 187);
  FB8 := TRung.create(109, 165, 119, 170);
  FB7 := TRung.create(109, 151, 119, 155);
  FB6 := TRung.create(109, 135, 119, 139);
  FB5 := TRung.create(109, 119, 119, 123);
  FB4 := TRung.create(109, 101, 119, 106);
  FB3 := TRung.create(109, 84, 119, 88);
  FB2 := TRung.create(109, 65, 119, 70);
  FB1 := TRung.create(109, 45, 119, 49);
  FC7 := TRung.create(144, 177, 155, 187);
  FC6 := TRung.create(144, 155, 155, 164);
  FC5 := TRung.create(144, 132, 155, 141);
  FC4 := TRung.create(144, 109, 155, 118);
  FC3 := TRung.create(144, 87, 155, 96);
  FC2 := TRung.create(144, 66, 155, 75);
  FC1 := TRung.create(144, 45, 155, 54);
end;

(* ********************************************************************* *)
{ TD013ptResistor.destroy }
destructor TD013ptResistor.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TD013ptResistor.GetAsString }
function TD013ptResistor.GetAsString: string;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TD013ptResistor.ShowTheForm }
procedure TD013ptResistor.ShowTheForm;
begin
  Application.CreateForm(TCutD013PointFrm, CutD013PointFrm);
  CutD013PointFrm.showmodal;
end;

(* ********************************************************************* *)
{ TD013ptResistor.AssignTo }
procedure TD013ptResistor.AssignTo(Dest: TPersistent);
begin
  if ((Dest is TD013ptResistor) and (Self is Dest.ClassType)) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TD013ptResistor do
    begin
      FStartResistance := Self.FStartResistance;
      TheString := Self.TheString;
      FA1 := Self.FA1;
      FA2 := Self.FA2;
      FA3 := Self.FA3;
      FA4 := Self.FA4;
      FA5 := Self.FA5;
      FA6 := Self.FA6;
      FA7 := Self.FA7;
      FB1 := Self.FB1;
      FB2 := Self.FB2;
      FB3 := Self.FB3;
      FB4 := Self.FB4;
      FB5 := Self.FB5;
      FB6 := Self.FB6;
      FB7 := Self.FB7;
      FB8 := Self.FB8;
      FB9 := Self.FB9;
      FC1 := Self.FC1;
      FC2 := Self.FC2;
      FC3 := Self.FC3;
      FC4 := Self.FC4;
      FC5 := Self.FC5;
      FC6 := Self.FC6;
      FC7 := Self.FC7;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TD013ptResistor.InitFields }
procedure TD013ptResistor.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TD013ptResistor.SaveToStream }
procedure TD013ptResistor.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FStartResistance, sizeof(shortstring));
  Stream.SaveBuffer(TheString, sizeof(shortstring));
  FA1.SaveToStream(Stream);
  FA2.SaveToStream(Stream);
  FA3.SaveToStream(Stream);
  FA4.SaveToStream(Stream);
  FA5.SaveToStream(Stream);
  FA6.SaveToStream(Stream);
  FA7.SaveToStream(Stream);
  FB1.SaveToStream(Stream);
  FB2.SaveToStream(Stream);
  FB3.SaveToStream(Stream);
  FB4.SaveToStream(Stream);
  FB5.SaveToStream(Stream);
  FB6.SaveToStream(Stream);
  FB7.SaveToStream(Stream);
  FB8.SaveToStream(Stream);
  FB9.SaveToStream(Stream);
  FC1.SaveToStream(Stream);
  FC2.SaveToStream(Stream);
  FC3.SaveToStream(Stream);
  FC4.SaveToStream(Stream);
  FC5.SaveToStream(Stream);
  FC6.SaveToStream(Stream);
  FC7.SaveToStream(Stream);
end;

(* ********************************************************************* *)
{ TD013ptResistor.ReadFromStream }
procedure TD013ptResistor.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FStartResistance, sizeof(shortstring));
  Stream.ReadBuffer(TheString, sizeof(shortstring));
  FA1 := TRung.CreateFromStream(Stream);
  FA2 := TRung.CreateFromStream(Stream);
  FA3 := TRung.CreateFromStream(Stream);
  FA4 := TRung.CreateFromStream(Stream);
  FA5 := TRung.CreateFromStream(Stream);
  FA6 := TRung.CreateFromStream(Stream);
  FA7 := TRung.CreateFromStream(Stream);
  FB1 := TRung.CreateFromStream(Stream);
  FB2 := TRung.CreateFromStream(Stream);
  FB3 := TRung.CreateFromStream(Stream);
  FB4 := TRung.CreateFromStream(Stream);
  FB5 := TRung.CreateFromStream(Stream);
  FB6 := TRung.CreateFromStream(Stream);
  FB7 := TRung.CreateFromStream(Stream);
  FB8 := TRung.CreateFromStream(Stream);
  FB9 := TRung.CreateFromStream(Stream);
  FC1 := TRung.CreateFromStream(Stream);
  FC2 := TRung.CreateFromStream(Stream);
  FC3 := TRung.CreateFromStream(Stream);
  FC4 := TRung.CreateFromStream(Stream);
  FC5 := TRung.CreateFromStream(Stream);
  FC6 := TRung.CreateFromStream(Stream);
  FC7 := TRung.CreateFromStream(Stream);
end;

(* ********************************************* *)
(* TCutD01 3 pt. Form Methods *)
(* ********************************************* *)
(* ********************************************************************* *)
{ TCutD013PointFrm.BN_RestoreClick }
procedure TCutD013PointFrm.BN_RestoreClick(Sender: TObject);
begin
  with D013ptResistor do
  begin
    FA1.Fix(Image1.Canvas);
    FA2.Fix(Image1.Canvas);
    FA3.Fix(Image1.Canvas);
    FA4.Fix(Image1.Canvas);
    FA5.Fix(Image1.Canvas);
    FA6.Fix(Image1.Canvas);
    FA7.Fix(Image1.Canvas);
    FB1.Fix(Image1.Canvas);
    FB2.Fix(Image1.Canvas);
    FB3.Fix(Image1.Canvas);
    FB4.Fix(Image1.Canvas);
    FB5.Fix(Image1.Canvas);
    FB6.Fix(Image1.Canvas);
    FB7.Fix(Image1.Canvas);
    FB8.Fix(Image1.Canvas);
    FB9.Fix(Image1.Canvas);
    FC1.Fix(Image1.Canvas);
    FC2.Fix(Image1.Canvas);
    FC3.Fix(Image1.Canvas);
    FC4.Fix(Image1.Canvas);
    FC5.Fix(Image1.Canvas);
    FC6.Fix(Image1.Canvas);
    FC7.Fix(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TCutD012ptForm.Recalculate }
procedure TCutD013PointFrm.ReCalculate;
const
  { FOIL SQUARES - SEE CCP's Data Sheet }
  S1 = 23.8 / 10.0;
  S2 = 15.0 / 5.6;
  S3 = 23.8 / 5.0;
  S4 = 25.0 / 5.6;
  S5 = 25.0 / 5.6;
  S6 = 29.4 / 10.0;
  S7 = 20.0 / 17.0;
  S8 = 30.0 / 11.2;
  S9 = 17.6 / 10.0;
  S10 = 30.0 / 11.2;
  S11 = 18.4 / 10.0;
  S12 = 30.0 / 11.2;
  S13 = 1.85;
  S14 = 27.0 / 11.2;
  TOTALSQUARES = 17.855829278;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorAnd: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorUnit: array [0 .. MAXERRORLENGTH - 1] of char;
  cs: array [0 .. 255] of char;
  EditStrings: string;
  s: string;
  StrMsg: string;
  StrUnit: string;
  StrAnd: string;
  C: RealType;
  CA: RealType;
  CB: RealType;
  CC: RealType;
  Squares: RealType;
  Rtotal: RealType;
  RStart: RealType;
  OhmsPerSquare: RealType;
  code: integer;
  Button: integer;
begin
  OhmsPerSquare := 0.0;
  { Read Starting Resistance }
  s := EB_StartingRes.text;
  StrVal(s, RStart, code);
  if code <> 0 then
  begin
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    RStart := 0;
    ST_CalculatedRes.caption := '';
    exit;
  end
  else if (RStart < 0.01) or (RStart > 10) then
  begin
    LoadString(hinstance, ID_SZ_WrongResistor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    LoadString(hinstance, ID_SZ_Ohms, ErrorUnit, sizeof(ErrorUnit));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    EditStrings := StrMsg + ' ' + '0.01' + ' ' + StrAnd + ' ' + '10.0' + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    RStart := 0;
    ST_CalculatedRes.caption := '';
    exit;
  end;
  if RStart > 0 then
  begin
    OhmsPerSquare := RStart / TOTALSQUARES;
  end;
  { Calculate Ladder "A" }
  C := (D013ptResistor.FA1.IsCut / S9) + (1 / (2 * S8 + S7));
  C := (D013ptResistor.FA2.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FA3.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FA4.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FA5.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FA6.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  CA := (D013ptResistor.FA7.IsCut / S9) + (1 / (2 * S14 + 1 / C));
  { Calculate Ladder "B" }
  C := (D013ptResistor.FB1.IsCut / S3) + (1 / (2 * S2 + S1));
  C := (D013ptResistor.FB2.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB3.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB4.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB5.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB6.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB7.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  C := (D013ptResistor.FB8.IsCut / S3) + (1 / (2 * S4 + 1 / C));
  CB := (D013ptResistor.FB9.IsCut / S6) + (1 / (2 * S5 + 1 / C));
  { Calculate Ladder "C" }
  C := (D013ptResistor.FC1.IsCut / S9) + (1 / (2 * S8 + S7));
  C := (D013ptResistor.FC2.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FC3.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FC4.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FC5.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  C := (D013ptResistor.FC6.IsCut / S9) + (1 / (2 * S10 + 1 / C));
  CC := (D013ptResistor.FC7.IsCut / S9) + (1 / (2 * S14 + 1 / C));
  { Calculate total resistance }
  Squares := 1 / CA + 1 / CB + 1 / CC + 2 * (S11 + S12 + S13);
  Rtotal := OhmsPerSquare * Squares;
  { Display }
  if Rtotal > 0 then
  begin
    // Str(Rtotal:7:1, s);
    s := format('%7.1f', [Rtotal]);
    StrPCopy(cs, s);
    ST_CalculatedRes.caption := s;
  end
  else
    ST_CalculatedRes.caption := s;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.Image1MouseDown }
procedure TCutD013PointFrm.Image1MouseDown(Sender: TObject;
  Button: TMouseButton; Shift: TShiftState; X, Y: integer);
var
  p: TPoint;
begin
  { ...retrieving the point clicked }
  p.X := X;
  p.Y := Y;
  with D013ptResistor do
  begin
    { ...Checking whether to cut or fix A1 depending on if it is already cut or fixed }
    if FA1.IsClicked(p) then
      if FA1.RungIsCut then
        FA1.Fix(Image1.Canvas)
      else
        FA1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A2 depending on if it is already cut or fixed }
    if FA2.IsClicked(p) then
      if FA2.RungIsCut then
        FA2.Fix(Image1.Canvas)
      else
        FA2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A3 depending on if it is already cut or fixed }
    if FA3.IsClicked(p) then
      if FA3.RungIsCut then
        FA3.Fix(Image1.Canvas)
      else
        FA3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A4 depending on if it is already cut or fixed }
    if FA4.IsClicked(p) then
      if FA4.RungIsCut then
        FA4.Fix(Image1.Canvas)
      else
        FA4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A5 depending on if it is already cut or fixed }
    if FA5.IsClicked(p) then
      if FA5.RungIsCut then
        FA5.Fix(Image1.Canvas)
      else
        FA5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A6 depending on if it is already cut or fixed }
    if FA6.IsClicked(p) then
      if FA6.RungIsCut then
        FA6.Fix(Image1.Canvas)
      else
        FA6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A7 depending on if it is already cut or fixed }
    if FA7.IsClicked(p) then
      if FA7.RungIsCut then
        FA7.Fix(Image1.Canvas)
      else
        FA7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B1 depending on if it is already cut or fixed }
    if FB1.IsClicked(p) then
      if FB1.RungIsCut then
        FB1.Fix(Image1.Canvas)
      else
        FB1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B2 depending on if it is already cut or fixed }
    if FB2.IsClicked(p) then
      if FB2.RungIsCut then
        FB2.Fix(Image1.Canvas)
      else
        FB2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B3 depending on if it is already cut or fixed }
    if FB3.IsClicked(p) then
      if FB3.RungIsCut then
        FB3.Fix(Image1.Canvas)
      else
        FB3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B4 depending on if it is already cut or fixed }
    if FB4.IsClicked(p) then
      if FB4.RungIsCut then
        FB4.Fix(Image1.Canvas)
      else
        FB4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B5 depending on if it is already cut or fixed }
    if FB5.IsClicked(p) then
      if FB5.RungIsCut then
        FB5.Fix(Image1.Canvas)
      else
        FB5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B6 depending on if it is already cut or fixed }
    if FB6.IsClicked(p) then
      if FB6.RungIsCut then
        FB6.Fix(Image1.Canvas)
      else
        FB6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B7 depending on if it is already cut or fixed }
    if FB7.IsClicked(p) then
      if FB7.RungIsCut then
        FB7.Fix(Image1.Canvas)
      else
        FB7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B8 depending on if it is already cut or fixed }
    if FB8.IsClicked(p) then
      if FB8.RungIsCut then
        FB8.Fix(Image1.Canvas)
      else
        FB8.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B9 depending on if it is already cut or fixed }
    if FB9.IsClicked(p) then
      if FB9.RungIsCut then
        FB9.Fix(Image1.Canvas)
      else
        FB9.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C1 depending on if it is already cut or fixed }
    if FC1.IsClicked(p) then
      if FC1.RungIsCut then
        FC1.Fix(Image1.Canvas)
      else
        FC1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C2 depending on if it is already cut or fixed }
    if FC2.IsClicked(p) then
      if FC2.RungIsCut then
        FC2.Fix(Image1.Canvas)
      else
        FC2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C3 depending on if it is already cut or fixed }
    if FC3.IsClicked(p) then
      if FC3.RungIsCut then
        FC3.Fix(Image1.Canvas)
      else
        FC3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C4 depending on if it is already cut or fixed }
    if FC4.IsClicked(p) then
      if FC4.RungIsCut then
        FC4.Fix(Image1.Canvas)
      else
        FC4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C5 depending on if it is already cut or fixed }
    if FC5.IsClicked(p) then
      if FC5.RungIsCut then
        FC5.Fix(Image1.Canvas)
      else
        FC5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C6 depending on if it is already cut or fixed }
    if FC6.IsClicked(p) then
      if FC6.RungIsCut then
        FC6.Fix(Image1.Canvas)
      else
        FC6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C7 depending on if it is already cut or fixed }
    if FC7.IsClicked(p) then
      if FC7.RungIsCut then
        FC7.Fix(Image1.Canvas)
      else
        FC7.Cut(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.FormCreate }
procedure TCutD013PointFrm.FormCreate(Sender: TObject);
begin
  D013ptResistor := TD013ptResistor.create;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.FormActivate }
procedure TCutD013PointFrm.FormActivate(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  TheItem := nil;
  i := 0;
  { ...getting item from object if there is one }
  Repeat
    if MainForm.FLog.AtIndex(i) is TD013ptResistor then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  if TheItem <> nil then
  begin
    { ..getting the starting resistance rom object and place in edit box }
    EB_StartingRes.text := (TheItem as TD013ptResistor).StartResistance;
    { ...Getting A1 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA1.RungIsCut then
      D013ptResistor.FA1.Cut(Image1.Canvas)
    else
      D013ptResistor.FA1.Fix(Image1.Canvas);
    { ...Getting A2 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA2.RungIsCut then
      D013ptResistor.FA2.Cut(Image1.Canvas)
    else
      D013ptResistor.FA2.Fix(Image1.Canvas);
    { ...Getting A3 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA3.RungIsCut then
      D013ptResistor.FA3.Cut(Image1.Canvas)
    else
      D013ptResistor.FA3.Fix(Image1.Canvas);
    { ...Getting A4 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA4.RungIsCut then
      D013ptResistor.FA4.Cut(Image1.Canvas)
    else
      D013ptResistor.FA4.Fix(Image1.Canvas);
    { ...Getting A5 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA5.RungIsCut then
      D013ptResistor.FA5.Cut(Image1.Canvas)
    else
      D013ptResistor.FA5.Fix(Image1.Canvas);
    { ...Getting A6 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA6.RungIsCut then
      D013ptResistor.FA6.Cut(Image1.Canvas)
    else
      D013ptResistor.FA6.Fix(Image1.Canvas);
    { ...Getting A7 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FA7.RungIsCut then
      D013ptResistor.FA7.Cut(Image1.Canvas)
    else
      D013ptResistor.FA7.Fix(Image1.Canvas);
    { ...Getting B1 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB1.RungIsCut then
      D013ptResistor.FB1.Cut(Image1.Canvas)
    else
      D013ptResistor.FB1.Fix(Image1.Canvas);
    { ...Getting B2 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB2.RungIsCut then
      D013ptResistor.FB2.Cut(Image1.Canvas)
    else
      D013ptResistor.FB2.Fix(Image1.Canvas);
    { ...Getting B3 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB3.RungIsCut then
      D013ptResistor.FB3.Cut(Image1.Canvas)
    else
      D013ptResistor.FB3.Fix(Image1.Canvas);
    { ...Getting B4 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB4.RungIsCut then
      D013ptResistor.FB4.Cut(Image1.Canvas)
    else
      D013ptResistor.FB4.Fix(Image1.Canvas);
    { ...Getting B5 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB5.RungIsCut then
      D013ptResistor.FB5.Cut(Image1.Canvas)
    else
      D013ptResistor.FB5.Fix(Image1.Canvas);
    { ...Getting B6 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB6.RungIsCut then
      D013ptResistor.FB6.Cut(Image1.Canvas)
    else
      D013ptResistor.FB6.Fix(Image1.Canvas);
    { ...Getting B7 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB7.RungIsCut then
      D013ptResistor.FB7.Cut(Image1.Canvas)
    else
      D013ptResistor.FB7.Fix(Image1.Canvas);
    { ...Getting B8 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB8.RungIsCut then
      D013ptResistor.FB8.Cut(Image1.Canvas)
    else
      D013ptResistor.FB8.Fix(Image1.Canvas);
    { ...Getting B9 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FB9.RungIsCut then
      D013ptResistor.FB9.Cut(Image1.Canvas)
    else
      D013ptResistor.FB9.Fix(Image1.Canvas);
    { ...Getting C1 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC1.RungIsCut then
      D013ptResistor.FC1.Cut(Image1.Canvas)
    else
      D013ptResistor.FC1.Fix(Image1.Canvas);
    { ...Getting C2 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC2.RungIsCut then
      D013ptResistor.FC2.Cut(Image1.Canvas)
    else
      D013ptResistor.FC2.Fix(Image1.Canvas);
    { ...Getting C3 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC3.RungIsCut then
      D013ptResistor.FC3.Cut(Image1.Canvas)
    else
      D013ptResistor.FC3.Fix(Image1.Canvas);
    { ...Getting C4 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC4.RungIsCut then
      D013ptResistor.FC4.Cut(Image1.Canvas)
    else
      D013ptResistor.FC4.Fix(Image1.Canvas);
    { ...Getting C5 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC5.RungIsCut then
      D013ptResistor.FC5.Cut(Image1.Canvas)
    else
      D013ptResistor.FC5.Fix(Image1.Canvas);
    { ...Getting C6 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC6.RungIsCut then
      D013ptResistor.FC6.Cut(Image1.Canvas)
    else
      D013ptResistor.FC6.Fix(Image1.Canvas);
    { ...Getting C7 item from object and Checking whether to cut or fix }
    if (TheItem as TD013ptResistor).FC7.RungIsCut then
      D013ptResistor.FC7.Cut(Image1.Canvas)
    else
      D013ptResistor.FC7.Fix(Image1.Canvas);
    ReCalculate;
  end;
  EB_StartingRes.setfocus;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.BN_OKClick }
procedure TCutD013PointFrm.BN_OKClick(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TD013ptResistor then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { If there is an object, then placing values in edit boxes }
  if TheItem = nil then
  begin
    { ...placing the fields in the object }
    D013ptResistor.StartResistance := EB_StartingRes.text;
    D013ptResistor.FA1.RungIsCut := D013ptResistor.FA1.RungIsCut;
    D013ptResistor.FA2.RungIsCut := D013ptResistor.FA2.RungIsCut;
    D013ptResistor.FA3.RungIsCut := D013ptResistor.FA3.RungIsCut;
    D013ptResistor.FA4.RungIsCut := D013ptResistor.FA4.RungIsCut;
    D013ptResistor.FA5.RungIsCut := D013ptResistor.FA5.RungIsCut;
    D013ptResistor.FA6.RungIsCut := D013ptResistor.FA6.RungIsCut;
    D013ptResistor.FA7.RungIsCut := D013ptResistor.FA7.RungIsCut;
    D013ptResistor.FB1.RungIsCut := D013ptResistor.FB1.RungIsCut;
    D013ptResistor.FB2.RungIsCut := D013ptResistor.FB2.RungIsCut;
    D013ptResistor.FB3.RungIsCut := D013ptResistor.FB3.RungIsCut;
    D013ptResistor.FB4.RungIsCut := D013ptResistor.FB4.RungIsCut;
    D013ptResistor.FB5.RungIsCut := D013ptResistor.FB5.RungIsCut;
    D013ptResistor.FB6.RungIsCut := D013ptResistor.FB6.RungIsCut;
    D013ptResistor.FB7.RungIsCut := D013ptResistor.FB7.RungIsCut;
    D013ptResistor.FB8.RungIsCut := D013ptResistor.FB8.RungIsCut;
    D013ptResistor.FB9.RungIsCut := D013ptResistor.FB9.RungIsCut;
    D013ptResistor.FC1.RungIsCut := D013ptResistor.FC1.RungIsCut;
    D013ptResistor.FC2.RungIsCut := D013ptResistor.FC2.RungIsCut;
    D013ptResistor.FC3.RungIsCut := D013ptResistor.FC3.RungIsCut;
    D013ptResistor.FC4.RungIsCut := D013ptResistor.FC4.RungIsCut;
    D013ptResistor.FC5.RungIsCut := D013ptResistor.FC5.RungIsCut;
    D013ptResistor.FC6.RungIsCut := D013ptResistor.FC6.RungIsCut;
    D013ptResistor.FC7.RungIsCut := D013ptResistor.FC7.RungIsCut;
    MainForm.AddToLog(D013ptResistor);
  end
  else
  begin
    (TheItem as TD013ptResistor).StartResistance := EB_StartingRes.text;
    (TheItem as TD013ptResistor).FA1.RungIsCut := D013ptResistor.FA1.RungIsCut;
    (TheItem as TD013ptResistor).FA2.RungIsCut := D013ptResistor.FA2.RungIsCut;
    (TheItem as TD013ptResistor).FA3.RungIsCut := D013ptResistor.FA3.RungIsCut;
    (TheItem as TD013ptResistor).FA4.RungIsCut := D013ptResistor.FA4.RungIsCut;
    (TheItem as TD013ptResistor).FA5.RungIsCut := D013ptResistor.FA5.RungIsCut;
    (TheItem as TD013ptResistor).FA6.RungIsCut := D013ptResistor.FA6.RungIsCut;
    (TheItem as TD013ptResistor).FA7.RungIsCut := D013ptResistor.FA7.RungIsCut;
    (TheItem as TD013ptResistor).FB1.RungIsCut := D013ptResistor.FB1.RungIsCut;
    (TheItem as TD013ptResistor).FB2.RungIsCut := D013ptResistor.FB2.RungIsCut;
    (TheItem as TD013ptResistor).FB3.RungIsCut := D013ptResistor.FB3.RungIsCut;
    (TheItem as TD013ptResistor).FB4.RungIsCut := D013ptResistor.FB4.RungIsCut;
    (TheItem as TD013ptResistor).FB5.RungIsCut := D013ptResistor.FB5.RungIsCut;
    (TheItem as TD013ptResistor).FB6.RungIsCut := D013ptResistor.FB6.RungIsCut;
    (TheItem as TD013ptResistor).FB7.RungIsCut := D013ptResistor.FB7.RungIsCut;
    (TheItem as TD013ptResistor).FB8.RungIsCut := D013ptResistor.FB8.RungIsCut;
    (TheItem as TD013ptResistor).FB9.RungIsCut := D013ptResistor.FB9.RungIsCut;
    (TheItem as TD013ptResistor).FC1.RungIsCut := D013ptResistor.FC1.RungIsCut;
    (TheItem as TD013ptResistor).FC2.RungIsCut := D013ptResistor.FC2.RungIsCut;
    (TheItem as TD013ptResistor).FC3.RungIsCut := D013ptResistor.FC3.RungIsCut;
    (TheItem as TD013ptResistor).FC4.RungIsCut := D013ptResistor.FC4.RungIsCut;
    (TheItem as TD013ptResistor).FC5.RungIsCut := D013ptResistor.FC5.RungIsCut;
    (TheItem as TD013ptResistor).FC6.RungIsCut := D013ptResistor.FC6.RungIsCut;
    (TheItem as TD013ptResistor).FC7.RungIsCut := D013ptResistor.FC7.RungIsCut;
  end;
  MainForm.IsDirty := true;
  close;
end;

procedure TCutD013PointFrm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.GotFormImage }
function TCutD013PointFrm.GotFormImage: TBitmap;
var
  ScreenDC, PrintDC: HDC;
  OldBits, PrintBits: HBITMAP;
  PaintLParam: Longint;
  procedure PrintHandle(Handle: HWND);
  var
    R: TRect;
    Child: HWND;
    SavedIndex: integer;
  begin
    if { IsWindowVisible(Handle) } true then
    begin
      SavedIndex := SaveDC(PrintDC);
      WinProcs.GetClientRect(Handle, R);
      MapWindowPoints(Handle, Self.Handle, R, 2);
      with R do
      begin
        SetWindowOrgEx(PrintDC, -left, -top, nil);
        IntersectClipRect(PrintDC, 0, 0, right - left, bottom - top);
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
    // if GetWinFlags and $4000 <> 0 then PaintLParam := PrintDC or $DEFE0000;
    try
      PrintBits := CreateCompatibleBitmap(ScreenDC, ClientWidth, ClientHeight);
      try
        OldBits := SelectObject(PrintDC, PrintBits);
        try
          { Clear the contents of the bitmap }
          FillRect(PrintDC, ClientRect, brush.Handle);
          { Paint form into a bitmap }
          PrintHandle(Handle);
        finally
          SelectObject(PrintDC, OldBits);
        end;
        Result := TBitmap.create;
        Result.Handle := PrintBits;
        PrintBits := 0;
      except
        Result.Free;
        if PrintBits <> 0 then
          DeleteObject(PrintBits);
        raise;
      end;
    finally
      DeleteDC(PrintDC);
    end;
  finally
    ReleaseDC(0, ScreenDC);
  end;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.PrintForm }
procedure TCutD013PointFrm.PrintForm;
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
            PrintWidth := MulDiv(DIBWidth, PageHeight, DIBHeight);
            if PrintWidth < PageWidth then
              PrintHeight := PageHeight
            else
            begin
              PrintWidth := PageWidth;
              PrintHeight := MulDiv(DIBHeight, PageWidth, DIBWidth);
            end;
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

(* ********************************************************************* *)
{ TCutD013PointFrm.BN_PrintClick }
procedure TCutD013PointFrm.BN_PrintClick(Sender: TObject);
begin
  BN_OK.visible := false;
  BN_Cancel.visible := false;
  BN_Help.visible := false;
  BN_Restore.visible := false;
  BN_Print.visible := false;
  PrintForm;
  BN_OK.visible := true;
  BN_Cancel.visible := true;
  BN_Help.visible := true;
  BN_Restore.visible := true;
  BN_Print.visible := true;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.EB_StartingResExit }
procedure TCutD013PointFrm.EB_StartingResExit(Sender: TObject);
begin
  ReCalculate;
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.BN_HelpClick }
procedure TCutD013PointFrm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3040);
end;

(* ********************************************************************* *)
{ TCutD013PointFrm.BN_CancelClick }
procedure TCutD013PointFrm.BN_CancelClick(Sender: TObject);
begin
  close;
end;

begin
  { ...Registering the object }
  RegisterClasses([TD013ptResistor]);

end.
