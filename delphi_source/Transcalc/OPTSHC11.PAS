(* ********************************************** *)
(* Opt. Shunt Cut C11 Resistor Unit *)
(* ********************************************** *)
unit Optshc11;

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
  (* TC11 Resistor Object *)
  (* ********************************************** *)
type
  TC11OptShuntResist = class(TResistor)
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
    A1, A2, A3, A4, A5, A6, A7, A8, A9, A10: TRung;
    B1, B2, B3, B4, B5, B6, B7, B8, B9, B10: TRung;
    C1, C2, C3, C4: TRung;
    D1, D2, D3, D4: TRung;
    constructor create;
    destructor destroy; override;
    property StartResistance: shortstring read FStartResistance
      write FStartResistance;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************** *)
  (* TC11 Resistor Form Object *)
  (* ********************************************** *)
type
  TOptShuntC11Form = class(TForm)
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
    procedure BN_RestoreClick(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure FormCreate(Sender: TObject);
    procedure Image1MouseDown(Sender: TObject; Button: TMouseButton;
      Shift: TShiftState; X, Y: integer);
    procedure ReCalculate;
    procedure PrintForm;
    function GotFormImage: TBitmap;
    procedure BN_PrintClick(Sender: TObject);
    procedure EB_StartingResExit(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
  public
    C11OptShuntResist: TC11OptShuntResist;
  private
  end;

var
  OptShuntC11Form: TOptShuntC11Form;

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
(* TC11OptShuntResist Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TC11OptShuntResist.create }
constructor TC11OptShuntResist.create;
begin
  inherited create;
  { ...setting the string so can identify which object it is }
  TheString := 'C11 Resistor';
  { ...setting the cutting area of each rung }
  A10 := TRung.create(50, 216, 69, 223);
  A9 := TRung.create(50, 196, 69, 203);
  A8 := TRung.create(50, 176, 69, 183);
  A7 := TRung.create(50, 156, 69, 163);
  A6 := TRung.create(50, 136, 69, 143);
  A5 := TRung.create(50, 116, 69, 123);
  A4 := TRung.create(50, 96, 69, 103);
  A3 := TRung.create(50, 76, 69, 83);
  A2 := TRung.create(50, 56, 69, 63);
  A1 := TRung.create(50, 36, 69, 43);
  B10 := TRung.create(110, 216, 130, 223);
  B9 := TRung.create(110, 196, 130, 203);
  B8 := TRung.create(110, 176, 130, 183);
  B7 := TRung.create(110, 156, 130, 163);
  B6 := TRung.create(110, 136, 130, 143);
  B5 := TRung.create(110, 116, 130, 123);
  B4 := TRung.create(110, 96, 130, 103);
  B3 := TRung.create(110, 76, 130, 83);
  B2 := TRung.create(110, 56, 130, 63);
  B1 := TRung.create(110, 36, 130, 43);
  C4 := TRung.create(163, 214, 169, 223);
  C3 := TRung.create(163, 164, 169, 171);
  C2 := TRung.create(163, 116, 169, 121);
  C1 := TRung.create(163, 67, 169, 73);
  D4 := TRung.create(190, 214, 196, 223);
  D3 := TRung.create(190, 164, 196, 171);
  D2 := TRung.create(190, 116, 196, 121);
  D1 := TRung.create(190, 67, 196, 73);
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.destroy }
destructor TC11OptShuntResist.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.GetAsString }
function TC11OptShuntResist.GetAsString: string;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.ShowTheForm }
procedure TC11OptShuntResist.ShowTheForm;
begin
  Application.CreateForm(TOptShuntC11Form, OptShuntC11Form);
  OptShuntC11Form.showmodal;
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.AssignTo }
procedure TC11OptShuntResist.AssignTo(Dest: TPersistent);
begin
  if ((Dest is TC11OptShuntResist) and (Self is Dest.ClassType)) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TC11OptShuntResist do
    begin
      FStartResistance := Self.FStartResistance;
      TheString := Self.TheString;
      A1 := Self.A1;
      A2 := Self.A2;
      A3 := Self.A3;
      A4 := Self.A4;
      A5 := Self.A5;
      A6 := Self.A6;
      A7 := Self.A7;
      A8 := Self.A8;
      A9 := Self.A9;
      A10 := Self.A10;
      B1 := Self.B1;
      B2 := Self.B2;
      B3 := Self.B3;
      B4 := Self.B4;
      B5 := Self.B5;
      B6 := Self.B6;
      B7 := Self.B7;
      B8 := Self.B8;
      B9 := Self.B9;
      B10 := Self.B10;
      C1 := Self.C1;
      C2 := Self.C2;
      C3 := Self.C3;
      C4 := Self.C4;
      D1 := Self.D1;
      D2 := Self.D2;
      D3 := Self.D3;
      D4 := Self.D4;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.InitFields }
procedure TC11OptShuntResist.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.SaveToStream }
procedure TC11OptShuntResist.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FStartResistance, sizeof(shortstring));
  Stream.SaveBuffer(TheString, sizeof(shortstring));
  A1.SaveToStream(Stream);
  A2.SaveToStream(Stream);
  A3.SaveToStream(Stream);
  A4.SaveToStream(Stream);
  A5.SaveToStream(Stream);
  A6.SaveToStream(Stream);
  A7.SaveToStream(Stream);
  A8.SaveToStream(Stream);
  A9.SaveToStream(Stream);
  A10.SaveToStream(Stream);
  B1.SaveToStream(Stream);
  B2.SaveToStream(Stream);
  B3.SaveToStream(Stream);
  B4.SaveToStream(Stream);
  B5.SaveToStream(Stream);
  B6.SaveToStream(Stream);
  B7.SaveToStream(Stream);
  B8.SaveToStream(Stream);
  B9.SaveToStream(Stream);
  B10.SaveToStream(Stream);
  C1.SaveToStream(Stream);
  C2.SaveToStream(Stream);
  C3.SaveToStream(Stream);
  C4.SaveToStream(Stream);
  D1.SaveToStream(Stream);
  D2.SaveToStream(Stream);
  D3.SaveToStream(Stream);
  D4.SaveToStream(Stream);
end;

(* ********************************************************************* *)
{ TC11OptShuntResist.ReadFromStream }
procedure TC11OptShuntResist.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FStartResistance, sizeof(shortstring));
  Stream.ReadBuffer(TheString, sizeof(shortstring));
  A1 := TRung.CreateFromStream(Stream);
  A2 := TRung.CreateFromStream(Stream);
  A3 := TRung.CreateFromStream(Stream);
  A4 := TRung.CreateFromStream(Stream);
  A5 := TRung.CreateFromStream(Stream);
  A6 := TRung.CreateFromStream(Stream);
  A7 := TRung.CreateFromStream(Stream);
  A8 := TRung.CreateFromStream(Stream);
  A9 := TRung.CreateFromStream(Stream);
  A10 := TRung.CreateFromStream(Stream);
  B1 := TRung.CreateFromStream(Stream);
  B2 := TRung.CreateFromStream(Stream);
  B3 := TRung.CreateFromStream(Stream);
  B4 := TRung.CreateFromStream(Stream);
  B5 := TRung.CreateFromStream(Stream);
  B6 := TRung.CreateFromStream(Stream);
  B7 := TRung.CreateFromStream(Stream);
  B8 := TRung.CreateFromStream(Stream);
  B9 := TRung.CreateFromStream(Stream);
  B10 := TRung.CreateFromStream(Stream);
  C1 := TRung.CreateFromStream(Stream);
  C2 := TRung.CreateFromStream(Stream);
  C3 := TRung.CreateFromStream(Stream);
  C4 := TRung.CreateFromStream(Stream);
  D1 := TRung.CreateFromStream(Stream);
  D2 := TRung.CreateFromStream(Stream);
  D3 := TRung.CreateFromStream(Stream);
  D4 := TRung.CreateFromStream(Stream);
end;

(* ********************************************* *)
(* TOptShuntC11 Form Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TOptShuntC11Form.Image1MouseDown }
procedure TOptShuntC11Form.Image1MouseDown(Sender: TObject;
  Button: TMouseButton; Shift: TShiftState; X, Y: integer);
var
  p: TPoint;
begin
  { ...retrieving the point clicked }
  p.X := X;
  p.Y := Y;
  with C11OptShuntResist do
  begin
    { ...Checking whether to cut or fix A1 depending on if it is already cut or fixed }
    if A1.IsClicked(p) then
      if A1.RungIsCut then
        A1.Fix(Image1.Canvas)
      else
        A1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A2 depending on if it is already cut or fixed }
    if A2.IsClicked(p) then
      if A2.RungIsCut then
        A2.Fix(Image1.Canvas)
      else
        A2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A3 depending on if it is already cut or fixed }
    if A3.IsClicked(p) then
      if A3.RungIsCut then
        A3.Fix(Image1.Canvas)
      else
        A3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A4 depending on if it is already cut or fixed }
    if A4.IsClicked(p) then
      if A4.RungIsCut then
        A4.Fix(Image1.Canvas)
      else
        A4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A5 depending on if it is already cut or fixed }
    if A5.IsClicked(p) then
      if A5.RungIsCut then
        A5.Fix(Image1.Canvas)
      else
        A5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A6 depending on if it is already cut or fixed }
    if A6.IsClicked(p) then
      if A6.RungIsCut then
        A6.Fix(Image1.Canvas)
      else
        A6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A7 depending on if it is already cut or fixed }
    if A7.IsClicked(p) then
      if A7.RungIsCut then
        A7.Fix(Image1.Canvas)
      else
        A7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A8 depending on if it is already cut or fixed }
    if A8.IsClicked(p) then
      if A8.RungIsCut then
        A8.Fix(Image1.Canvas)
      else
        A8.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A9 depending on if it is already cut or fixed }
    if A9.IsClicked(p) then
      if A9.RungIsCut then
        A9.Fix(Image1.Canvas)
      else
        A9.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix A10 depending on if it is already cut or fixed }
    if A10.IsClicked(p) then
      if A10.RungIsCut then
        A10.Fix(Image1.Canvas)
      else
        A10.Cut(Image1.Canvas);
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
    { ...Checking whether to cut or fix B5 depending on if it is already cut or fixed }
    if B5.IsClicked(p) then
      if B5.RungIsCut then
        B5.Fix(Image1.Canvas)
      else
        B5.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B6 depending on if it is already cut or fixed }
    if B6.IsClicked(p) then
      if B6.RungIsCut then
        B6.Fix(Image1.Canvas)
      else
        B6.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B7 depending on if it is already cut or fixed }
    if B7.IsClicked(p) then
      if B7.RungIsCut then
        B7.Fix(Image1.Canvas)
      else
        B7.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B8 depending on if it is already cut or fixed }
    if B8.IsClicked(p) then
      if B8.RungIsCut then
        B8.Fix(Image1.Canvas)
      else
        B8.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B9 depending on if it is already cut or fixed }
    if B9.IsClicked(p) then
      if B9.RungIsCut then
        B9.Fix(Image1.Canvas)
      else
        B9.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix B10 depending on if it is already cut or fixed }
    if B10.IsClicked(p) then
      if B10.RungIsCut then
        B10.Fix(Image1.Canvas)
      else
        B10.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C1 depending on if it is already cut or fixed }
    if C1.IsClicked(p) then
      if C1.RungIsCut then
        C1.Fix(Image1.Canvas)
      else
        C1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C2 depending on if it is already cut or fixed }
    if C2.IsClicked(p) then
      if C2.RungIsCut then
        C2.Fix(Image1.Canvas)
      else
        C2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C3 depending on if it is already cut or fixed }
    if C3.IsClicked(p) then
      if C3.RungIsCut then
        C3.Fix(Image1.Canvas)
      else
        C3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix C4 depending on if it is already cut or fixed }
    if C4.IsClicked(p) then
      if C4.RungIsCut then
        C4.Fix(Image1.Canvas)
      else
        C4.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix D1 depending on if it is already cut or fixed }
    if D1.IsClicked(p) then
      if D1.RungIsCut then
        D1.Fix(Image1.Canvas)
      else
        D1.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix D2 depending on if it is already cut or fixed }
    if D2.IsClicked(p) then
      if D2.RungIsCut then
        D2.Fix(Image1.Canvas)
      else
        D2.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix D3 depending on if it is already cut or fixed }
    if D3.IsClicked(p) then
      if D3.RungIsCut then
        D3.Fix(Image1.Canvas)
      else
        D3.Cut(Image1.Canvas);
    { ...Checking whether to cut or fix D4 depending on if it is already cut or fixed }
    if D4.IsClicked(p) then
      if D4.RungIsCut then
        D4.Fix(Image1.Canvas)
      else
        D4.Cut(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.FormActivate }
procedure TOptShuntC11Form.FormActivate(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  TheItem := nil;
  i := 0;
  { ...getting item from object if there is one }
  Repeat
    if MainForm.FLog.AtIndex(i) is TC11OptShuntResist then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  if TheItem <> nil then
  begin
    { ..getting the starting resistance rom object and place in edit box }
    EB_StartingRes.text := (TheItem as TC11OptShuntResist).StartResistance;
    { ...Getting A1 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A1.RungIsCut then
      C11OptShuntResist.A1.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A1.Fix(Image1.Canvas);
    { ...Getting A2 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A2.RungIsCut then
      C11OptShuntResist.A2.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A2.Fix(Image1.Canvas);
    { ...Getting A3 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A3.RungIsCut then
      C11OptShuntResist.A3.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A3.Fix(Image1.Canvas);
    { ...Getting A4 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A4.RungIsCut then
      C11OptShuntResist.A4.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A4.Fix(Image1.Canvas);
    { ...Getting A5 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A5.RungIsCut then
      C11OptShuntResist.A5.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A5.Fix(Image1.Canvas);
    { ...Getting A6 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A6.RungIsCut then
      C11OptShuntResist.A6.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A6.Fix(Image1.Canvas);
    { ...Getting A7 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A7.RungIsCut then
      C11OptShuntResist.A7.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A7.Fix(Image1.Canvas);
    { ...Getting A8 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A8.RungIsCut then
      C11OptShuntResist.A8.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A8.Fix(Image1.Canvas);
    { ...Getting A9 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A9.RungIsCut then
      C11OptShuntResist.A9.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A9.Fix(Image1.Canvas);
    { ...Getting A10 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).A10.RungIsCut then
      C11OptShuntResist.A10.Cut(Image1.Canvas)
    else
      C11OptShuntResist.A10.Fix(Image1.Canvas);
    { ...Getting B1 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B1.RungIsCut then
      C11OptShuntResist.B1.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B1.Fix(Image1.Canvas);
    { ...Getting B2 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B2.RungIsCut then
      C11OptShuntResist.B2.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B2.Fix(Image1.Canvas);
    { ...Getting B3 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B3.RungIsCut then
      C11OptShuntResist.B3.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B3.Fix(Image1.Canvas);
    { ...Getting B4 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B4.RungIsCut then
      C11OptShuntResist.B4.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B4.Fix(Image1.Canvas);
    { ...Getting B5 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B5.RungIsCut then
      C11OptShuntResist.B5.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B5.Fix(Image1.Canvas);
    { ...Getting B6 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B6.RungIsCut then
      C11OptShuntResist.B6.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B6.Fix(Image1.Canvas);
    { ...Getting B7 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B7.RungIsCut then
      C11OptShuntResist.B7.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B7.Fix(Image1.Canvas);
    { ...Getting B8 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B8.RungIsCut then
      C11OptShuntResist.B8.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B8.Fix(Image1.Canvas);
    { ...Getting B9 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B9.RungIsCut then
      C11OptShuntResist.B9.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B9.Fix(Image1.Canvas);
    { ...Getting B10 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).B10.RungIsCut then
      C11OptShuntResist.B10.Cut(Image1.Canvas)
    else
      C11OptShuntResist.B10.Fix(Image1.Canvas);
    { ...Getting C1 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).C1.RungIsCut then
      C11OptShuntResist.C1.Cut(Image1.Canvas)
    else
      C11OptShuntResist.C1.Fix(Image1.Canvas);
    { ...Getting C2 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).C2.RungIsCut then
      C11OptShuntResist.C2.Cut(Image1.Canvas)
    else
      C11OptShuntResist.C2.Fix(Image1.Canvas);
    { ...Getting C3 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).C3.RungIsCut then
      C11OptShuntResist.C3.Cut(Image1.Canvas)
    else
      C11OptShuntResist.C3.Fix(Image1.Canvas);
    { ...Getting C4 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).C4.RungIsCut then
      C11OptShuntResist.C4.Cut(Image1.Canvas)
    else
      C11OptShuntResist.C4.Fix(Image1.Canvas);
    { ...Getting D1 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).D1.RungIsCut then
      C11OptShuntResist.D1.Cut(Image1.Canvas)
    else
      C11OptShuntResist.D1.Fix(Image1.Canvas);
    { ...Getting D2 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).D2.RungIsCut then
      C11OptShuntResist.D2.Cut(Image1.Canvas)
    else
      C11OptShuntResist.D2.Fix(Image1.Canvas);
    { ...Getting D3 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).D3.RungIsCut then
      C11OptShuntResist.D3.Cut(Image1.Canvas)
    else
      C11OptShuntResist.D3.Fix(Image1.Canvas);
    { ...Getting D4 item from object and Checking whether to cut or fix }
    if (TheItem as TC11OptShuntResist).D4.RungIsCut then
      C11OptShuntResist.D4.Cut(Image1.Canvas)
    else
      C11OptShuntResist.D4.Fix(Image1.Canvas);
    ReCalculate;
  end;
  EB_StartingRes.setfocus;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.FormCreate }
procedure TOptShuntC11Form.FormCreate(Sender: TObject);
begin
  C11OptShuntResist := TC11OptShuntResist.create;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.BN_OKClick }
procedure TOptShuntC11Form.BN_OKClick(Sender: TObject);
var
  i: integer;
  TheItem: TacStreamable;
begin
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TC11OptShuntResist then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { If there is an object, then placing values in edit boxes }
  if TheItem = nil then
  begin
    { ...placing the fields in the object }
    C11OptShuntResist.StartResistance := EB_StartingRes.text;
    C11OptShuntResist.A1.RungIsCut := C11OptShuntResist.A1.RungIsCut;
    C11OptShuntResist.A2.RungIsCut := C11OptShuntResist.A2.RungIsCut;
    C11OptShuntResist.A3.RungIsCut := C11OptShuntResist.A3.RungIsCut;
    C11OptShuntResist.A4.RungIsCut := C11OptShuntResist.A4.RungIsCut;
    C11OptShuntResist.A5.RungIsCut := C11OptShuntResist.A5.RungIsCut;
    C11OptShuntResist.A6.RungIsCut := C11OptShuntResist.A6.RungIsCut;
    C11OptShuntResist.A7.RungIsCut := C11OptShuntResist.A7.RungIsCut;
    C11OptShuntResist.A8.RungIsCut := C11OptShuntResist.A8.RungIsCut;
    C11OptShuntResist.A9.RungIsCut := C11OptShuntResist.A9.RungIsCut;
    C11OptShuntResist.A10.RungIsCut := C11OptShuntResist.A10.RungIsCut;
    C11OptShuntResist.B1.RungIsCut := C11OptShuntResist.B1.RungIsCut;
    C11OptShuntResist.B2.RungIsCut := C11OptShuntResist.B2.RungIsCut;
    C11OptShuntResist.B3.RungIsCut := C11OptShuntResist.B3.RungIsCut;
    C11OptShuntResist.B4.RungIsCut := C11OptShuntResist.B4.RungIsCut;
    C11OptShuntResist.B5.RungIsCut := C11OptShuntResist.B5.RungIsCut;
    C11OptShuntResist.B6.RungIsCut := C11OptShuntResist.B6.RungIsCut;
    C11OptShuntResist.B7.RungIsCut := C11OptShuntResist.B7.RungIsCut;
    C11OptShuntResist.B8.RungIsCut := C11OptShuntResist.B8.RungIsCut;
    C11OptShuntResist.B9.RungIsCut := C11OptShuntResist.B9.RungIsCut;
    C11OptShuntResist.B10.RungIsCut := C11OptShuntResist.B10.RungIsCut;
    C11OptShuntResist.C1.RungIsCut := C11OptShuntResist.C1.RungIsCut;
    C11OptShuntResist.C2.RungIsCut := C11OptShuntResist.C2.RungIsCut;
    C11OptShuntResist.C3.RungIsCut := C11OptShuntResist.C3.RungIsCut;
    C11OptShuntResist.C4.RungIsCut := C11OptShuntResist.C4.RungIsCut;
    C11OptShuntResist.D1.RungIsCut := C11OptShuntResist.D1.RungIsCut;
    C11OptShuntResist.D2.RungIsCut := C11OptShuntResist.D2.RungIsCut;
    C11OptShuntResist.D3.RungIsCut := C11OptShuntResist.D3.RungIsCut;
    C11OptShuntResist.D4.RungIsCut := C11OptShuntResist.D4.RungIsCut;
    MainForm.AddToLog(C11OptShuntResist);
  end
  else
  begin
    (TheItem as TC11OptShuntResist).StartResistance := EB_StartingRes.text;
    (TheItem as TC11OptShuntResist).A1.RungIsCut :=
      C11OptShuntResist.A1.RungIsCut;
    (TheItem as TC11OptShuntResist).A2.RungIsCut :=
      C11OptShuntResist.A2.RungIsCut;
    (TheItem as TC11OptShuntResist).A3.RungIsCut :=
      C11OptShuntResist.A3.RungIsCut;
    (TheItem as TC11OptShuntResist).A4.RungIsCut :=
      C11OptShuntResist.A4.RungIsCut;
    (TheItem as TC11OptShuntResist).A5.RungIsCut :=
      C11OptShuntResist.A5.RungIsCut;
    (TheItem as TC11OptShuntResist).A6.RungIsCut :=
      C11OptShuntResist.A6.RungIsCut;
    (TheItem as TC11OptShuntResist).A7.RungIsCut :=
      C11OptShuntResist.A7.RungIsCut;
    (TheItem as TC11OptShuntResist).A8.RungIsCut :=
      C11OptShuntResist.A8.RungIsCut;
    (TheItem as TC11OptShuntResist).A9.RungIsCut :=
      C11OptShuntResist.A9.RungIsCut;
    (TheItem as TC11OptShuntResist).A10.RungIsCut :=
      C11OptShuntResist.A10.RungIsCut;
    (TheItem as TC11OptShuntResist).B1.RungIsCut :=
      C11OptShuntResist.B1.RungIsCut;
    (TheItem as TC11OptShuntResist).B2.RungIsCut :=
      C11OptShuntResist.B2.RungIsCut;
    (TheItem as TC11OptShuntResist).B3.RungIsCut :=
      C11OptShuntResist.B3.RungIsCut;
    (TheItem as TC11OptShuntResist).B4.RungIsCut :=
      C11OptShuntResist.B4.RungIsCut;
    (TheItem as TC11OptShuntResist).B5.RungIsCut :=
      C11OptShuntResist.B5.RungIsCut;
    (TheItem as TC11OptShuntResist).B6.RungIsCut :=
      C11OptShuntResist.B6.RungIsCut;
    (TheItem as TC11OptShuntResist).B7.RungIsCut :=
      C11OptShuntResist.B7.RungIsCut;
    (TheItem as TC11OptShuntResist).B8.RungIsCut :=
      C11OptShuntResist.B8.RungIsCut;
    (TheItem as TC11OptShuntResist).B9.RungIsCut :=
      C11OptShuntResist.B9.RungIsCut;
    (TheItem as TC11OptShuntResist).B10.RungIsCut :=
      C11OptShuntResist.B10.RungIsCut;
    (TheItem as TC11OptShuntResist).C1.RungIsCut :=
      C11OptShuntResist.C1.RungIsCut;
    (TheItem as TC11OptShuntResist).C2.RungIsCut :=
      C11OptShuntResist.C2.RungIsCut;
    (TheItem as TC11OptShuntResist).C3.RungIsCut :=
      C11OptShuntResist.C3.RungIsCut;
    (TheItem as TC11OptShuntResist).C4.RungIsCut :=
      C11OptShuntResist.C4.RungIsCut;
    (TheItem as TC11OptShuntResist).D1.RungIsCut :=
      C11OptShuntResist.D1.RungIsCut;
    (TheItem as TC11OptShuntResist).D2.RungIsCut :=
      C11OptShuntResist.D2.RungIsCut;
    (TheItem as TC11OptShuntResist).D3.RungIsCut :=
      C11OptShuntResist.D3.RungIsCut;
    (TheItem as TC11OptShuntResist).D4.RungIsCut :=
      C11OptShuntResist.D4.RungIsCut;
  end;
  MainForm.IsDirty := true;
  close;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.BN_RestoreClick }
procedure TOptShuntC11Form.BN_RestoreClick(Sender: TObject);
begin
  with C11OptShuntResist do
  begin
    A1.Fix(Image1.Canvas);
    A2.Fix(Image1.Canvas);
    A3.Fix(Image1.Canvas);
    A4.Fix(Image1.Canvas);
    A5.Fix(Image1.Canvas);
    A6.Fix(Image1.Canvas);
    A7.Fix(Image1.Canvas);
    A8.Fix(Image1.Canvas);
    A9.Fix(Image1.Canvas);
    A10.Fix(Image1.Canvas);
    B1.Fix(Image1.Canvas);
    B2.Fix(Image1.Canvas);
    B3.Fix(Image1.Canvas);
    B4.Fix(Image1.Canvas);
    B5.Fix(Image1.Canvas);
    B6.Fix(Image1.Canvas);
    B7.Fix(Image1.Canvas);
    B8.Fix(Image1.Canvas);
    B9.Fix(Image1.Canvas);
    B10.Fix(Image1.Canvas);
    C1.Fix(Image1.Canvas);
    C2.Fix(Image1.Canvas);
    C3.Fix(Image1.Canvas);
    C4.Fix(Image1.Canvas);
    D1.Fix(Image1.Canvas);
    D2.Fix(Image1.Canvas);
    D3.Fix(Image1.Canvas);
    D4.Fix(Image1.Canvas);
    ReCalculate;
  end;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.ReCalculate }
procedure TOptShuntC11Form.ReCalculate;
const
  { FOIL SQUARES - SEE JRW's B.S. }
  S1 = 1.6;
  S2 = 0.6;
  S3 = 1.30;
  S4 = 2.0;
  S5 = 0.30;
  S6 = 3.0;
  S7 = 0.8;
  S8 = 2.0;
  S9 = 8.8;
  S10 = 2.0;
  S11 = 2.0;
  S12 = 20.0;
  S13 = 8.8;
  S14 = 8.8;
  S15 = 17.2;
  S16 = 35.0;
  S17 = 2.0;
  S18 = 2.0;
  S19 = 17.2;
  S20 = 90.5;
  S21 = 39.0;
  S22 = 1.5;
  S23 = 1.5;
  TOTALSQUARES = 150.0;
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
  CD: RealType;
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
  else if (RStart < 3) or (RStart > 7) then
  begin
    LoadString(hinstance, ID_SZ_WrongResistor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    LoadString(hinstance, ID_SZ_Ohms, ErrorUnit, sizeof(ErrorUnit));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    EditStrings := StrMsg + ' ' + '3.0' + ' ' + StrAnd + ' ' + '7.0' + ' '
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
  C := (C11OptShuntResist.A1.IsCut / S3) + (1 / (2 * S7 + S6));
  C := (C11OptShuntResist.A2.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A3.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A4.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A5.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A6.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A7.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A8.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.A9.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  CA := (C11OptShuntResist.A10.IsCut / S10) + (1 / (2 * S2 + 1 / C));
  { Calculate Ladder "B" }
  C := (C11OptShuntResist.B1.IsCut / S3) + (1 / (2 * S7 + S6));
  C := (C11OptShuntResist.B2.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B3.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B4.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B5.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B6.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B7.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B8.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  C := (C11OptShuntResist.B9.IsCut / S3) + (1 / (2 * S5 + S3 + 1 / C));
  CB := (C11OptShuntResist.B10.IsCut / S10) + (1 / (2 * S2 + 1 / C));
  { Calculate Ladder "C" }
  C := (C11OptShuntResist.C1.IsCut / S10) + (1 / S12);
  C := (C11OptShuntResist.C2.IsCut / S11) + (1 / (S9 + S13 + 1 / C));
  C := (C11OptShuntResist.C3.IsCut / S10) + (1 / (S9 + S13 + 1 / C));
  CC := (C11OptShuntResist.C4.IsCut / S18) + (1 / (S9 + S14 + 1 / C));
  { Calculate Ladder "D" }
  C := (C11OptShuntResist.D1.IsCut / S17) + (1 / S16);
  C := (C11OptShuntResist.D2.IsCut / S18) + (1 / (S15 + S19 + 1 / C));
  C := (C11OptShuntResist.D3.IsCut / S17) + (1 / (S15 + S19 + 1 / C));
  C := (C11OptShuntResist.D4.IsCut / S18) + (1 / (S15 + S19 + 1 / C));
  CD := C;
  { Calculate total resistance }
  Squares := 1 / CA + 1 / CB + 1 / CC + 1 / CD + S20 + S8 + S8 + S8 + S8 +
    S4 + S21 + S22 + S1 + S23;
  Rtotal := OhmsPerSquare * Squares;;
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
{ TOptShuntC11Form.FormClose }
procedure TOptShuntC11Form.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.GotFormImage }
function TOptShuntC11Form.GotFormImage: TBitmap;
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
{ TOptShuntC11Form.PrintForm }
procedure TOptShuntC11Form.PrintForm;
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
{ TOptShuntC11Form.BN_PrintClick }
procedure TOptShuntC11Form.BN_PrintClick(Sender: TObject);
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
{ TOptShuntC11Form.EB_StartingResExit }
procedure TOptShuntC11Form.EB_StartingResExit(Sender: TObject);
begin
  ReCalculate;
end;

(* ********************************************************************* *)
{ TOptShuntC11Form.BN_HelpClick }
procedure TOptShuntC11Form.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3031);
end;

begin
  { ...Registering the object }
  RegisterClasses([TC11OptShuntResist]);

end.
