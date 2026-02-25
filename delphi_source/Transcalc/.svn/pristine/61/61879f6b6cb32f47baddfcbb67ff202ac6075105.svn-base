(* **************************************************** *)
(* Span, Span 3 point Cut C12 20 ohm Resistor Unit *)
(* **************************************************** *)
unit Spns1220;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, acList, acStream, Log, LogItem,
  LogStrm, Dialogs, Resistor, Printers;

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
    function IsCut: integer;
    procedure Cut(TheCanvas: TCanvas);
    procedure Fix(TheCanvas: TCanvas);
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
    procedure Redraw(TheCanvas: TCanvas);
  end;

  (* ********************************************** *)
  (* TC1220 Resistor Object *)
  (* ********************************************** *)
type
  TC1220SpanSpanResist = class(TResistor)
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
    FA1, FA2, FA3, FA4, FA5, FA6, FA7, FA8, FA9, FA10: TRung;
    SA1, SA2, SA3, SA4, SA5, SA6, SA7, SA8, SA9, SA10: TRung;
    B1, B2, B3, B4: TRung;
    FC1, FC2: TRung;
    SC1, SC2: TRung;
    constructor create;
    destructor destroy; override;
    property StartResistance: shortstring read FStartResistance
      write FStartResistance;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************** *)
  (* TC1220 Resistor Form Object *)
  (* ********************************************** *)
type
  TSpanSpanC1220Form = class(TForm)
    Image1: TImage;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    BN_Restore: TBitBtn;
    BN_Help: TBitBtn;
    BN_Print: TBitBtn;
    GroupBox1: TGroupBox;
    Label2: TLabel;
    EB_StartingRes: TEdit;
    GroupBox2: TGroupBox;
    ST_CalculatedRes: TLabel;
    Label1: TLabel;
    procedure Image1MouseDown(Sender: TObject; Button: TMouseButton;
      Shift: TShiftState; X, Y: integer);
    procedure FormActivate(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure BN_RestoreClick(Sender: TObject);
    procedure ReCalculate;
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure PrintForm;
    function GotFormImage: TBitmap;
    procedure BN_PrintClick(Sender: TObject);
    procedure EB_StartingResExit(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
  public
    C1220SpanSpanResist: TC1220SpanSpanResist;
  private
  end;

var
  SpanSpanC1220Form: TSpanSpanC1220Form;

implementation

uses MainMenu, Convert;
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
(* TC1220SpanSpanResist Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TC1220SpanSpanResist.create }
constructor TC1220SpanSpanResist.create;
begin
  inherited create;
  { ...setting the string so can identify which object it is }
  TheString := 'C12 20 ohm Resistor';
  { ...setting the cutting area of each rung }
  FA10 := TRung.create(29, 223, 49, 228);
  FA9 := TRung.create(29, 203, 49, 209);
  FA8 := TRung.create(29, 183, 49, 189);
  FA7 := TRung.create(29, 163, 49, 169);
  FA6 := TRung.create(29, 143, 49, 149);
  FA5 := TRung.create(29, 123, 49, 129);
  FA4 := TRung.create(29, 103, 49, 109);
  FA3 := TRung.create(29, 83, 49, 89);
  FA2 := TRung.create(29, 63, 49, 69);
  FA1 := TRung.create(29, 43, 49, 49);
  SA10 := TRung.create(90, 223, 110, 228);
  SA9 := TRung.create(90, 203, 110, 209);
  SA8 := TRung.create(90, 183, 110, 189);
  SA7 := TRung.create(90, 163, 110, 169);
  SA6 := TRung.create(90, 143, 110, 149);
  SA5 := TRung.create(90, 123, 110, 129);
  SA4 := TRung.create(90, 103, 110, 109);
  SA3 := TRung.create(90, 83, 110, 89);
  SA2 := TRung.create(90, 63, 110, 69);
  SA1 := TRung.create(90, 43, 110, 49);
  B4 := TRung.create(142, 222, 148, 229);
  B3 := TRung.create(142, 170, 148, 177);
  B2 := TRung.create(142, 122, 148, 127);
  B1 := TRung.create(142, 73, 148, 79);
  FC2 := TRung.create(169, 221, 175, 229);
  FC1 := TRung.create(169, 122, 175, 127);
  SC2 := TRung.create(197, 222, 204, 229);
  SC1 := TRung.create(197, 122, 204, 127);
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.destroy }
destructor TC1220SpanSpanResist.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.GetAsString }
function TC1220SpanSpanResist.GetAsString: string;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.ShowTheForm }
procedure TC1220SpanSpanResist.ShowTheForm;
begin
  Application.CreateForm(TSpanSpanC1220Form, SpanSpanC1220Form);
  SpanSpanC1220Form.showmodal;
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.AssignTo }
procedure TC1220SpanSpanResist.AssignTo(Dest: TPersistent);
begin
  if ((Dest is TC1220SpanSpanResist) and (Self is Dest.ClassType)) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TC1220SpanSpanResist do
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
      FA8 := Self.FA8;
      FA9 := Self.FA9;
      FA10 := Self.FA10;
      SA1 := Self.SA1;
      SA2 := Self.SA2;
      SA3 := Self.SA3;
      SA4 := Self.SA4;
      SA5 := Self.SA5;
      SA6 := Self.SA6;
      SA7 := Self.SA7;
      SA8 := Self.SA8;
      SA9 := Self.SA9;
      SA10 := Self.SA10;
      B1 := Self.B1;
      B2 := Self.B2;
      B3 := Self.B3;
      B4 := Self.B4;
      FC1 := Self.FC1;
      FC2 := Self.FC2;
      SC1 := Self.SC1;
      SC2 := Self.SC2;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.InitFields }
procedure TC1220SpanSpanResist.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.SaveToStream }
procedure TC1220SpanSpanResist.SaveToStream(Stream: TacObjStream);
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
  FA8.SaveToStream(Stream);
  FA9.SaveToStream(Stream);
  FA10.SaveToStream(Stream);
  SA1.SaveToStream(Stream);
  SA2.SaveToStream(Stream);
  SA3.SaveToStream(Stream);
  SA4.SaveToStream(Stream);
  SA5.SaveToStream(Stream);
  SA6.SaveToStream(Stream);
  SA7.SaveToStream(Stream);
  SA8.SaveToStream(Stream);
  SA9.SaveToStream(Stream);
  SA10.SaveToStream(Stream);
  B1.SaveToStream(Stream);
  B2.SaveToStream(Stream);
  B3.SaveToStream(Stream);
  B4.SaveToStream(Stream);
  FC1.SaveToStream(Stream);
  FC2.SaveToStream(Stream);
  SC1.SaveToStream(Stream);
  SC2.SaveToStream(Stream);
end;

(* ********************************************************************* *)
{ TC1220SpanSpanResist.ReadFromStream }
procedure TC1220SpanSpanResist.ReadFromStream(Stream: TacObjStream);
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
  FA8 := TRung.CreateFromStream(Stream);
  FA9 := TRung.CreateFromStream(Stream);
  FA10 := TRung.CreateFromStream(Stream);
  SA1 := TRung.CreateFromStream(Stream);
  SA2 := TRung.CreateFromStream(Stream);
  SA3 := TRung.CreateFromStream(Stream);
  SA4 := TRung.CreateFromStream(Stream);
  SA5 := TRung.CreateFromStream(Stream);
  SA6 := TRung.CreateFromStream(Stream);
  SA7 := TRung.CreateFromStream(Stream);
  SA8 := TRung.CreateFromStream(Stream);
  SA9 := TRung.CreateFromStream(Stream);
  SA10 := TRung.CreateFromStream(Stream);
  B1 := TRung.CreateFromStream(Stream);
  B2 := TRung.CreateFromStream(Stream);
  B3 := TRung.CreateFromStream(Stream);
  B4 := TRung.CreateFromStream(Stream);
  FC1 := TRung.CreateFromStream(Stream);
  FC2 := TRung.CreateFromStream(Stream);
  SC1 := TRung.CreateFromStream(Stream);
  SC2 := TRung.CreateFromStream(Stream);
end;

(* ********************************************* *)
(* TSpanSpanC1220 Form Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TSpanSpanC1220Form.BN_RestoreClick }
procedure TSpanSpanC1220Form.BN_RestoreClick(Sender: TObject);
begin
  with C1220SpanSpanResist do
  begin
    FA1.Fix(Image1.Canvas);
    FA2.Fix(Image1.Canvas);
    FA3.Fix(Image1.Canvas);
    FA4.Fix(Image1.Canvas);
    FA5.Fix(Image1.Canvas);
    FA6.Fix(Image1.Canvas);
    FA7.Fix(Image1.Canvas);
    FA8.Fix(Image1.Canvas);
    FA9.Fix(Image1.Canvas);
    FA10.Fix(Image1.Canvas);
    SA1.Fix(Image1.Canvas);
    SA2.Fix(Image1.Canvas);
    SA3.Fix(Image1.Canvas);
    SA4.Fix(Image1.Canvas);
    SA5.Fix(Image1.Canvas);
    SA6.Fix(Image1.Canvas);
    SA7.Fix(Image1.Canvas);
    SA8.Fix(Image1.Canvas);
    SA9.Fix(Image1.Canvas);
    SA10.Fix(Image1.Canvas);
    B1.Fix(Image1.Canvas);
    B2.Fix(Image1.Canvas);
    B3.Fix(Image1.Canvas);
    B4.Fix(Image1.Canvas);
    FC1.Fix(Image1.Canvas);
    FC2.Fix(Image1.Canvas);
    SC1.Fix(Image1.Canvas);
    SC2.Fix(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.ReCalculate }
procedure TSpanSpanC1220Form.ReCalculate;
const
  { FOIL SQUARES - SEE JRW's B.S. }
  S1 = 1.6;
  S2 = 2.9;
  S3 = 2.5;
  S4 = 1.0;
  S5 = 1.3;
  S6 = 3.5;
  S7 = 2.0;
  S8 = 1.0;
  S9 = 19.2;
  S10 = 2.0;
  S11 = 2.0;
  S12 = 42.0;
  S13 = 19.5;
  S14 = 19.5;
  S15 = 41.2;
  S16 = 85.4;
  S17 = 2.0;
  S18 = 3.0;
  S19 = 41.2;
  S20 = 393.7;
  S21 = 25;
  S22 = 1.5;
  S23 = 1.5;
  TOTALSQUARES = 440.0;
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
  CFA: RealType;
  CSA: RealType;
  CB: RealType;
  CFC: RealType;
  CSC: RealType;
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
  else if (RStart < 16) or (RStart > 24) then
  begin
    LoadString(hinstance, ID_SZ_WrongResistor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    LoadString(hinstance, ID_SZ_Ohms, ErrorUnit, sizeof(ErrorUnit));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    EditStrings := StrMsg + ' ' + '16.0' + ' ' + StrAnd + ' ' + '24.0' + ' '
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
  { Calculate Ladder First "A" }
  C := (C1220SpanSpanResist.FA1.IsCut / S3) + (1 / (2 * S7 + S6));
  C := (C1220SpanSpanResist.FA2.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA3.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA4.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA5.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA6.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA7.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA8.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.FA9.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  CFA := (C1220SpanSpanResist.FA10.IsCut / S10) + (1 / (2 * S2 + 1 / C));
  { Calculate Ladder Second "A" }
  C := (C1220SpanSpanResist.SA1.IsCut / S3) + (1 / (2 * S7 + S6));
  C := (C1220SpanSpanResist.SA2.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA3.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA4.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA5.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA6.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA7.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA8.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C1220SpanSpanResist.SA9.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  CSA := (C1220SpanSpanResist.SA10.IsCut / S10) + (1 / (2 * S2 + 1 / C));
  { Calculate Ladder "B" }
  C := (C1220SpanSpanResist.B1.IsCut / S10) + (1 / S12);
  C := (C1220SpanSpanResist.B2.IsCut / S11) + (1 / (S9 + S13 + 1 / C));
  C := (C1220SpanSpanResist.B3.IsCut / S10) + (1 / (S9 + S13 + 1 / C));
  CB := (C1220SpanSpanResist.B4.IsCut / S18) + (1 / (S9 + S14 + 1 / C));
  { Calculate Ladder First "C" }
  C := (C1220SpanSpanResist.FC1.IsCut / S17) + (1 / S16);
  C := (C1220SpanSpanResist.FC2.IsCut / S18) + (1 / (S15 + S19 + 1 / C));
  CFC := C;
  { Calculate Ladder Second "C" }
  C := (C1220SpanSpanResist.SC1.IsCut / S17) + (1 / S16);
  C := (C1220SpanSpanResist.SC2.IsCut / S18) + (1 / (S15 + S19 + 1 / C));
  CSC := C;
  { Calculate total resistance }
  Squares := 1 / CFA + 1 / CSA + 1 / CB + 1 / CFC + 1 / CSC + S20 + S8 + S8 + S8
    + S8 +
    S4 + S21 + S22 + S1 + S23;
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
{ TSpanSpanC1220Form.Image1MouseDown }
procedure TSpanSpanC1220Form.Image1MouseDown(Sender: TObject;
  Button: TMouseButton; Shift: TShiftState; X, Y: integer);
var
  p: TPoint;
begin
  { ...retrieving the point clicked }
  p.X := X;
  p.Y := Y;
  with C1220SpanSpanResist do
  begin
    { ...Checking whether to cut or fix FA1 depending on if it is already cut or fixed }
    if FA1.IsClicked(p) then
      if FA1.RungIsCut then
        FA1.Fix(Image1.Canvas)
      else
        FA1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA2 depending on if it is already cut or fixed }
    if FA2.IsClicked(p) then
      if FA2.RungIsCut then
        FA2.Fix(Image1.Canvas)
      else
        FA2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA3 depending on if it is already cut or fixed }
    if FA3.IsClicked(p) then
      if FA3.RungIsCut then
        FA3.Fix(Image1.Canvas)
      else
        FA3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA4 depending on if it is already cut or fixed }
    if FA4.IsClicked(p) then
      if FA4.RungIsCut then
        FA4.Fix(Image1.Canvas)
      else
        FA4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA5 depending on if it is already cut or fixed }
    if FA5.IsClicked(p) then
      if FA5.RungIsCut then
        FA5.Fix(Image1.Canvas)
      else
        FA5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA6 depending on if it is already cut or fixed }
    if FA6.IsClicked(p) then
      if FA6.RungIsCut then
        FA6.Fix(Image1.Canvas)
      else
        FA6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA7 depending on if it is already cut or fixed }
    if FA7.IsClicked(p) then
      if FA7.RungIsCut then
        FA7.Fix(Image1.Canvas)
      else
        FA7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA8 depending on if it is already cut or fixed }
    if FA8.IsClicked(p) then
      if FA8.RungIsCut then
        FA8.Fix(Image1.Canvas)
      else
        FA8.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA9 depending on if it is already cut or fixed }
    if FA9.IsClicked(p) then
      if FA9.RungIsCut then
        FA9.Fix(Image1.Canvas)
      else
        FA9.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FA10 depending on if it is already cut or fixed }
    if FA10.IsClicked(p) then
      if FA10.RungIsCut then
        FA10.Fix(Image1.Canvas)
      else
        FA10.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA1 depending on if it is already cut or fixed }
    if SA1.IsClicked(p) then
      if SA1.RungIsCut then
        SA1.Fix(Image1.Canvas)
      else
        SA1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA2 depending on if it is already cut or fixed }
    if SA2.IsClicked(p) then
      if SA2.RungIsCut then
        SA2.Fix(Image1.Canvas)
      else
        SA2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA3 depending on if it is already cut or fixed }
    if SA3.IsClicked(p) then
      if SA3.RungIsCut then
        SA3.Fix(Image1.Canvas)
      else
        SA3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA4 depending on if it is already cut or fixed }
    if SA4.IsClicked(p) then
      if SA4.RungIsCut then
        SA4.Fix(Image1.Canvas)
      else
        SA4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA5 depending on if it is already cut or fixed }
    if SA5.IsClicked(p) then
      if SA5.RungIsCut then
        SA5.Fix(Image1.Canvas)
      else
        SA5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA6 depending on if it is already cut or fixed }
    if SA6.IsClicked(p) then
      if SA6.RungIsCut then
        SA6.Fix(Image1.Canvas)
      else
        SA6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA7 depending on if it is already cut or fixed }
    if SA7.IsClicked(p) then
      if SA7.RungIsCut then
        SA7.Fix(Image1.Canvas)
      else
        SA7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA8 depending on if it is already cut or fixed }
    if SA8.IsClicked(p) then
      if SA8.RungIsCut then
        SA8.Fix(Image1.Canvas)
      else
        SA8.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA9 depending on if it is already cut or fixed }
    if SA9.IsClicked(p) then
      if SA9.RungIsCut then
        SA9.Fix(Image1.Canvas)
      else
        SA9.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SA10 depending on if it is already cut or fixed }
    if SA10.IsClicked(p) then
      if SA10.RungIsCut then
        SA10.Fix(Image1.Canvas)
      else
        SA10.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B1 depending on if it is already cut or fixed }
    if B1.IsClicked(p) then
      if B1.RungIsCut then
        B1.Fix(Image1.Canvas)
      else
        B1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B2 depending on if it is already cut or fixed }
    if B2.IsClicked(p) then
      if B2.RungIsCut then
        B2.Fix(Image1.Canvas)
      else
        B2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B3 depending on if it is already cut or fixed }
    if B3.IsClicked(p) then
      if B3.RungIsCut then
        B3.Fix(Image1.Canvas)
      else
        B3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B4 depending on if it is already cut or fixed }
    if B4.IsClicked(p) then
      if B4.RungIsCut then
        B4.Fix(Image1.Canvas)
      else
        B4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FC1 depending on if it is already cut or fixed }
    if FC1.IsClicked(p) then
      if FC1.RungIsCut then
        FC1.Fix(Image1.Canvas)
      else
        FC1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FC2 depending on if it is already cut or fixed }
    if FC2.IsClicked(p) then
      if FC2.RungIsCut then
        FC2.Fix(Image1.Canvas)
      else
        FC2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix SC1 depending on if it is already cut or fixed }
    if SC1.IsClicked(p) then
      if SC1.RungIsCut then
        SC1.Fix(Image1.Canvas)
      else
        SC1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix FC2 depending on if it is already cut or fixed }
    if SC2.IsClicked(p) then
      if SC2.RungIsCut then
        SC2.Fix(Image1.Canvas)
      else
        SC2.Cut(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TSpanSpanC01Form.FormActivate }
procedure TSpanSpanC1220Form.FormActivate(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  TheItem := nil;
  i := 0;
  { ...getting item from object if there is one }
  Repeat
    if MainForm.FLog.AtIndex(i) is TC1220SpanSpanResist then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  if TheItem <> nil then
  begin
    { ..getting the starting resistance rom object and place in edit box }
    EB_StartingRes.text := (TheItem as TC1220SpanSpanResist).StartResistance;
    { ...Getting FA1 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA1.RungIsCut then
      C1220SpanSpanResist.FA1.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA1.Fix(Image1.Canvas);
    { ...Getting A2 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA2.RungIsCut then
      C1220SpanSpanResist.FA2.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA2.Fix(Image1.Canvas);
    { ...Getting FA3 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA3.RungIsCut then
      C1220SpanSpanResist.FA3.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA3.Fix(Image1.Canvas);
    { ...Getting FA4 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA4.RungIsCut then
      C1220SpanSpanResist.FA4.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA4.Fix(Image1.Canvas);
    { ...Getting FA5 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA5.RungIsCut then
      C1220SpanSpanResist.FA5.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA5.Fix(Image1.Canvas);
    { ...Getting FA6 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA6.RungIsCut then
      C1220SpanSpanResist.FA6.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA6.Fix(Image1.Canvas);
    { ...Getting FA7 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA7.RungIsCut then
      C1220SpanSpanResist.FA7.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA7.Fix(Image1.Canvas);
    { ...Getting FA8 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA8.RungIsCut then
      C1220SpanSpanResist.FA8.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA8.Fix(Image1.Canvas);
    { ...Getting FA9 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA9.RungIsCut then
      C1220SpanSpanResist.FA9.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA9.Fix(Image1.Canvas);
    { ...Getting FA10 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FA10.RungIsCut then
      C1220SpanSpanResist.FA10.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FA10.Fix(Image1.Canvas);
    { ...Getting SA1 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA1.RungIsCut then
      C1220SpanSpanResist.SA1.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA1.Fix(Image1.Canvas);
    { ...Getting SA2 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA2.RungIsCut then
      C1220SpanSpanResist.SA2.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA2.Fix(Image1.Canvas);
    { ...Getting SA3 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA3.RungIsCut then
      C1220SpanSpanResist.SA3.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA3.Fix(Image1.Canvas);
    { ...Getting SA4 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA4.RungIsCut then
      C1220SpanSpanResist.SA4.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA4.Fix(Image1.Canvas);
    { ...Getting SA5 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA5.RungIsCut then
      C1220SpanSpanResist.SA5.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA5.Fix(Image1.Canvas);
    { ...Getting SA6 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA6.RungIsCut then
      C1220SpanSpanResist.SA6.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA6.Fix(Image1.Canvas);
    { ...Getting SA7 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA7.RungIsCut then
      C1220SpanSpanResist.SA7.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA7.Fix(Image1.Canvas);
    { ...Getting SA8 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA8.RungIsCut then
      C1220SpanSpanResist.SA8.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA8.Fix(Image1.Canvas);
    { ...Getting SA9 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA9.RungIsCut then
      C1220SpanSpanResist.SA9.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA9.Fix(Image1.Canvas);
    { ...Getting SA10 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SA10.RungIsCut then
      C1220SpanSpanResist.SA10.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SA10.Fix(Image1.Canvas);
    { ...Getting B1 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).B1.RungIsCut then
      C1220SpanSpanResist.B1.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.B1.Fix(Image1.Canvas);
    { ...Getting B2 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).B2.RungIsCut then
      C1220SpanSpanResist.B2.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.B2.Fix(Image1.Canvas);
    { ...Getting B3 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).B3.RungIsCut then
      C1220SpanSpanResist.B3.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.B3.Fix(Image1.Canvas);
    { ...Getting B4 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).B4.RungIsCut then
      C1220SpanSpanResist.B4.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.B4.Fix(Image1.Canvas);
    { ...Getting FC1 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FC1.RungIsCut then
      C1220SpanSpanResist.FC1.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FC1.Fix(Image1.Canvas);
    { ...Getting FC2 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).FC2.RungIsCut then
      C1220SpanSpanResist.FC2.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.FC2.Fix(Image1.Canvas);
    { ...Getting SC1 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SC1.RungIsCut then
      C1220SpanSpanResist.SC1.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SC1.Fix(Image1.Canvas);
    { ...Getting SC2 item from object and Checking whether to cut or fix }
    if (TheItem as TC1220SpanSpanResist).SC2.RungIsCut then
      C1220SpanSpanResist.SC2.Cut(Image1.Canvas)
    else
      C1220SpanSpanResist.SC2.Fix(Image1.Canvas);
    ReCalculate;
  end;
  EB_StartingRes.setfocus;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.FormCreate }
procedure TSpanSpanC1220Form.FormCreate(Sender: TObject);
begin
  C1220SpanSpanResist := TC1220SpanSpanResist.create;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.BN_OKClick }
procedure TSpanSpanC1220Form.BN_OKClick(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TC1220SpanSpanResist then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { If there is an object, then placing values in edit boxes }
  if TheItem = nil then
  begin
    { ...placing the fields in the object }
    C1220SpanSpanResist.StartResistance := EB_StartingRes.text;
    C1220SpanSpanResist.FA1.RungIsCut := C1220SpanSpanResist.FA1.RungIsCut;
    C1220SpanSpanResist.FA2.RungIsCut := C1220SpanSpanResist.FA2.RungIsCut;
    C1220SpanSpanResist.FA3.RungIsCut := C1220SpanSpanResist.FA3.RungIsCut;
    C1220SpanSpanResist.FA4.RungIsCut := C1220SpanSpanResist.FA4.RungIsCut;
    C1220SpanSpanResist.FA5.RungIsCut := C1220SpanSpanResist.FA5.RungIsCut;
    C1220SpanSpanResist.FA6.RungIsCut := C1220SpanSpanResist.FA6.RungIsCut;
    C1220SpanSpanResist.FA7.RungIsCut := C1220SpanSpanResist.FA7.RungIsCut;
    C1220SpanSpanResist.FA8.RungIsCut := C1220SpanSpanResist.FA8.RungIsCut;
    C1220SpanSpanResist.FA9.RungIsCut := C1220SpanSpanResist.FA9.RungIsCut;
    C1220SpanSpanResist.FA10.RungIsCut := C1220SpanSpanResist.FA10.RungIsCut;
    C1220SpanSpanResist.SA1.RungIsCut := C1220SpanSpanResist.SA1.RungIsCut;
    C1220SpanSpanResist.SA2.RungIsCut := C1220SpanSpanResist.SA2.RungIsCut;
    C1220SpanSpanResist.SA3.RungIsCut := C1220SpanSpanResist.SA3.RungIsCut;
    C1220SpanSpanResist.SA4.RungIsCut := C1220SpanSpanResist.SA4.RungIsCut;
    C1220SpanSpanResist.SA5.RungIsCut := C1220SpanSpanResist.SA5.RungIsCut;
    C1220SpanSpanResist.SA6.RungIsCut := C1220SpanSpanResist.SA6.RungIsCut;
    C1220SpanSpanResist.SA7.RungIsCut := C1220SpanSpanResist.SA7.RungIsCut;
    C1220SpanSpanResist.SA8.RungIsCut := C1220SpanSpanResist.SA8.RungIsCut;
    C1220SpanSpanResist.SA9.RungIsCut := C1220SpanSpanResist.SA9.RungIsCut;
    C1220SpanSpanResist.SA10.RungIsCut := C1220SpanSpanResist.SA10.RungIsCut;
    C1220SpanSpanResist.B1.RungIsCut := C1220SpanSpanResist.B1.RungIsCut;
    C1220SpanSpanResist.B2.RungIsCut := C1220SpanSpanResist.B2.RungIsCut;
    C1220SpanSpanResist.B3.RungIsCut := C1220SpanSpanResist.B3.RungIsCut;
    C1220SpanSpanResist.B4.RungIsCut := C1220SpanSpanResist.B4.RungIsCut;
    C1220SpanSpanResist.FC1.RungIsCut := C1220SpanSpanResist.FC1.RungIsCut;
    C1220SpanSpanResist.FC2.RungIsCut := C1220SpanSpanResist.FC2.RungIsCut;
    C1220SpanSpanResist.SC1.RungIsCut := C1220SpanSpanResist.SC1.RungIsCut;
    C1220SpanSpanResist.SC2.RungIsCut := C1220SpanSpanResist.SC2.RungIsCut;
    MainForm.AddToLog(C1220SpanSpanResist);
  end
  else
  begin
    (TheItem as TC1220SpanSpanResist).StartResistance := EB_StartingRes.text;
    (TheItem as TC1220SpanSpanResist).FA1.RungIsCut :=
      C1220SpanSpanResist.FA1.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA2.RungIsCut :=
      C1220SpanSpanResist.FA2.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA3.RungIsCut :=
      C1220SpanSpanResist.FA3.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA4.RungIsCut :=
      C1220SpanSpanResist.FA4.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA5.RungIsCut :=
      C1220SpanSpanResist.FA5.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA6.RungIsCut :=
      C1220SpanSpanResist.FA6.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA7.RungIsCut :=
      C1220SpanSpanResist.FA7.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA8.RungIsCut :=
      C1220SpanSpanResist.FA8.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA9.RungIsCut :=
      C1220SpanSpanResist.FA9.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FA10.RungIsCut :=
      C1220SpanSpanResist.FA10.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA1.RungIsCut :=
      C1220SpanSpanResist.SA1.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA2.RungIsCut :=
      C1220SpanSpanResist.SA2.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA3.RungIsCut :=
      C1220SpanSpanResist.SA3.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA4.RungIsCut :=
      C1220SpanSpanResist.SA4.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA5.RungIsCut :=
      C1220SpanSpanResist.SA5.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA6.RungIsCut :=
      C1220SpanSpanResist.SA6.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA7.RungIsCut :=
      C1220SpanSpanResist.SA7.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA8.RungIsCut :=
      C1220SpanSpanResist.SA8.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA9.RungIsCut :=
      C1220SpanSpanResist.SA9.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SA10.RungIsCut :=
      C1220SpanSpanResist.SA10.RungIsCut;
    (TheItem as TC1220SpanSpanResist).B1.RungIsCut :=
      C1220SpanSpanResist.B1.RungIsCut;
    (TheItem as TC1220SpanSpanResist).B2.RungIsCut :=
      C1220SpanSpanResist.B2.RungIsCut;
    (TheItem as TC1220SpanSpanResist).B3.RungIsCut :=
      C1220SpanSpanResist.B3.RungIsCut;
    (TheItem as TC1220SpanSpanResist).B4.RungIsCut :=
      C1220SpanSpanResist.B4.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FC1.RungIsCut :=
      C1220SpanSpanResist.FC1.RungIsCut;
    (TheItem as TC1220SpanSpanResist).FC2.RungIsCut :=
      C1220SpanSpanResist.FC2.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SC1.RungIsCut :=
      C1220SpanSpanResist.SC1.RungIsCut;
    (TheItem as TC1220SpanSpanResist).SC2.RungIsCut :=
      C1220SpanSpanResist.SC2.RungIsCut;
  end;
  MainForm.IsDirty := true;
  close;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.FormClose }
procedure TSpanSpanC1220Form.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.GotFormImage }
function TSpanSpanC1220Form.GotFormImage: TBitmap;
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
{ TSpanSpanC1220Form.PrintForm }
procedure TSpanSpanC1220Form.PrintForm;
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
{ TSpanSpanC1220Form.BN_PrintClick }
procedure TSpanSpanC1220Form.BN_PrintClick(Sender: TObject);
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
{ TSpanSpanC1220Form.EB_StartingResExit }
procedure TSpanSpanC1220Form.EB_StartingResExit(Sender: TObject);
begin
  ReCalculate;
end;

(* ********************************************************************* *)
{ TSpanSpanC1220Form.BN_HelpClick }
procedure TSpanSpanC1220Form.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3033);
end;

begin
  { ...Registering the object }
  RegisterClasses([TC1220SpanSpanResist]);

end.
