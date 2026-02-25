(************************************************)
(*  Cut D01 Unit                                *)
(************************************************)
unit Cutd01;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, acList, acStream, Log, LogItem,
  LogStrm, Dialogs;

type
  RealType = double;

(************************************************)
(*  TRung Object                                *)
(************************************************)
type
  TRung = class(TLogItem)
  private
    CuttingArea : TRect;
  public
    RungIsCut   : Boolean;
    constructor create(left, top, right, bottom : integer);
    destructor done; virtual;
    function IsClicked(p : TPoint):boolean;
    procedure Cut(TheCanvas: TCanvas);
    procedure Fix(TheCanvas: TCanvas);
    procedure SaveToStream(Stream : TacObjStream); override;
    procedure ReadFromStream(Stream : TacObjStream); override;
    procedure Redraw(TheCanvas: TCanvas);
end;

(************************************************)
(*  TD01 Resistor Object                        *)
(************************************************)
type
  TD01Resistor = class(TLogItem)
  private
    TheString : string;
  protected
    procedure AssignTo(Dest: TPersistent); override;
    procedure ShowTheForm; override;
    function GetAsString : string; override;
    procedure InitFields; override;
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
  public
 {property and functions here}
    FA1, FA2, FA3, FA4, FA5, FA6, FA7           : TRung;
    FB1, FB2, FB3, FB4, FB5, FB6, FB7, FB8, FB9 : TRung;
    FC1, FC2, FC3, FC4, FC5, FC6, FC7           : TRung;
    constructor create;
    function answer : RealType;
end;

(************************************************)
(*  TCut D01 Form Object                        *)
(************************************************)
type
  TCutD01Form = class(TForm)
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    Image1: TImage;
    EB_EnterData: TEdit;
    procedure Image1MouseDown(Sender: TObject; Button: TMouseButton;
      Shift: TShiftState; X, Y: Integer);
    procedure FormCreate(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    public
     D01Resistor : TD01Resistor;
  end;
var
  CutD01Form: TCutD01Form;

implementation
uses MainMenu, OutlineX;
{$R *.DFM}


(***********************************************)
(*              TRung Methods                  *)
(***********************************************)

(***********************************************************************)
{TRung.create}
constructor TRung.create(left, top, right, bottom : integer);
begin
  inherited create;
  {...creating the TRung object setting the cutting area and intializing RungIsCut}
  RungIsCut := false;
  CuttingArea.left := left;
  CuttingArea.top := top;
  CuttingArea.right := right;
  CuttingArea.bottom := bottom;
end;

(***********************************************************************)
{TRung.done}
destructor TRung.done;
begin
  {...destroying the object}
  Done;
end;

(***********************************************************************)
{TRung.Redraw}
procedure TRung.Redraw(TheCanvas: TCanvas);
begin
  {..deciding whether to cut or fix the rung depending on whether it was fixed or cut}
  with TheCanvas do begin
    if RungIsCut = False then begin {...we need to restore the rung}
      pen.Color := clGray;
      brush.color := clGray;
    end
    else begin          {...we need to cut rung}
      pen.Color := clYellow;
      brush.color := clYellow;
    end;
    {...setting pen and  brush attributes}
    brush.Style := bsSolid;
    pen.style := psSolid;
    Rectangle(CuttingArea.Left, CuttingArea.top, CuttingArea.right, CuttingArea.Bottom);
  end;
end;

(***********************************************************************)
{TRung.SaveToStream}
procedure TRung.SaveToStream(Stream : TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(CuttingArea, sizeof(TRect));
  Stream.SaveBuffer(RungIsCut, sizeof(Boolean));
end;

(***********************************************************************)
{TRung.ReadFromStream}
procedure TRung.ReadFromStream(Stream : TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(CuttingArea, sizeof(TRect));
  Stream.ReadBuffer(RungIsCut, sizeof(Boolean));
end;

(***********************************************************************)
{TRung.IsClicked}
function TRung.IsClicked(p : TPoint): boolean;
begin
  {...determines if the point clicked is in which rectangle}
  Result := PtInRect(CuttingArea, p);
end;

(***********************************************************************)
{TRung.Cut}
procedure TRung.Cut(TheCanvas: TCanvas);
begin
  {...setting the RungIsCut Value}
  RungIsCut := true;
  {...Cutting the rung}
  Redraw(TheCanvas);
end;

(***********************************************************************)
{TRung.Fix}
procedure TRung.Fix(TheCanvas: TCanvas);
begin
  {...setting RungIsCut}
  RungIsCut := false;
  {...fixing the rung}
  Redraw(TheCanvas);
end;

(***********************************************)
(*          TD01Resistor Methods               *)
(***********************************************)

(***********************************************************************)
{TD01Resistor.create}
constructor TD01Resistor.create;
begin
  inherited create;
  {...setting the string so can identify which object it is}
  TheString := 'D01 Resistor';
  {...setting the cutting area of each rung}
  FA1 := TRung.Create(70, 177, 81, 187);
  FA2 := TRung.Create(70, 155, 81, 164);
  FA3 := TRung.Create(70, 132, 81, 141);
  FA4 := TRung.Create(70, 109, 81, 118);
  FA5 := TRung.Create(70, 87, 81, 96);
  FA6 := TRung.Create(70, 66, 81, 75);
  FA7 := TRung.Create(70, 45, 81, 54);
  FB1 := TRung.Create(109, 177, 119, 187);
  FB2 := TRung.Create(109, 165, 119, 170);
  FB3 := TRung.Create(109, 151, 119, 155);
  FB4 := TRung.Create(109, 135, 119, 139);
  FB5 := TRung.Create(109, 119, 119, 123);
  FB6 := TRung.Create(109, 101, 119, 106);
  FB7 := TRung.Create(109, 84, 119, 88);
  FB8 := TRung.Create(109, 65, 119, 70);
  FB9 := TRung.Create(109, 45, 119, 49);
  FC1 := TRung.Create(144, 177, 155, 187);
  FC2 := TRung.Create(144, 155, 155, 164);
  FC3 := TRung.Create(144, 132, 155, 141);
  FC4 := TRung.Create(144, 109, 155, 118);
  FC5 := TRung.Create(144, 87, 155, 96);
  FC6 := TRung.Create(144, 66, 155, 75);
  FC7 := TRung.Create(144, 45, 155, 54);
end;

(***********************************************************************)
{TD01Resistor.GetAsString}
function TD01Resistor.GetAsString : string;
begin
  Result := TheString;
end;

(***********************************************************************)
{TD01Resistor.ShowTheForm}
procedure TD01Resistor.ShowTheForm;
begin
  CutD01Form.show;
end;

(***********************************************************************)
{TD01Resistor.AssignTo}
procedure TD01Resistor.AssignTo(Dest: TPersistent);
begin
  if ((Dest is TD01Resistor) and (Self is Dest.ClassType)) then begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TD01Resistor do begin
      FA1 := self.FA1;
      FA2 := self.FA2;
      FA3 := self.FA3;
      FA4 := self.FA4;
      FA5 := self.FA5;
      FA6 := self.FA6;
      FA7 := self.FA7;
      FB1 := self.FB1;
      FB2 := self.FB2;
      FB3 := self.FB3;
      FB4 := self.FB4;
      FB5 := self.FB5;
      FB6 := self.FB6;
      FB7 := self.FB7;
      FB8 := self.FB8;
      FB9 := self.FB9;
      FC1 := self.FC1;
      FC2 := self.FC2;
      FC3 := self.FC3;
      FC4 := self.FC4;
      FC5 := self.FC5;
      FC6 := self.FC6;
      FC7 := self.FC7;
    end;
  end
  else begin
    inherited AssignTo(Dest);
  end;
end;

(***********************************************************************)
{TD01Resistor.InitFields}
procedure TD01Resistor.InitFields;
begin
  inherited initfields;
end;

(***********************************************************************)
{TD01Resistor.SaveToStream}
procedure TD01Resistor.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
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

(***********************************************************************)
{TD01Resistor.ReadFromStream}
procedure TD01Resistor.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
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

(***********************************************************************)
{TD01Resistor.answer}
function TD01Resistor.answer : RealType;
begin
end;

(***********************************************)
(*          TCutD01 Form Methods               *)
(***********************************************)

(***********************************************************************)
{TCutD01Form.Image1MouseDown}
procedure TCutD01Form.Image1MouseDown(Sender: TObject;
  Button: TMouseButton; Shift: TShiftState; X, Y: Integer);
var
  p      : TPoint;
begin
  {...retrieving the point clicked}
  p.x := x;
  p.y := y;
  with D01Resistor do begin
    {...Checking whether to cut or fix A1 depending on if it is already cut or fixed}
    if FA1.isClicked(p) then
      if FA1.RungIsCut then
        FA1.Fix(Image1.Canvas)
      else
        Fa1.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A2 depending on if it is already cut or fixed}
    if FA2.isClicked(p) then
      if FA2.RungIsCut then
        FA2.Fix(Image1.Canvas)
      else
        Fa2.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A3 depending on if it is already cut or fixed}
    if FA3.isClicked(p) then
      if FA3.RungIsCut then
        FA3.Fix(Image1.Canvas)
      else
        Fa3.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A4 depending on if it is already cut or fixed}
    if FA4.isClicked(p) then
      if FA4.RungIsCut then
        FA4.Fix(Image1.Canvas)
      else
        Fa4.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A5 depending on if it is already cut or fixed}
    if FA5.isClicked(p) then
      if FA5.RungIsCut then
        FA5.Fix(Image1.Canvas)
      else
        Fa5.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A6 depending on if it is already cut or fixed}
    if FA6.isClicked(p) then
      if FA6.RungIsCut then
        FA6.Fix(Image1.Canvas)
      else
        Fa6.Cut(Image1.Canvas);
    {...Checking whether to cut or fix A7 depending on if it is already cut or fixed}
    if FA7.isClicked(p) then
      if FA7.RungIsCut then
        FA7.Fix(Image1.Canvas)
      else
        Fa7.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B1 depending on if it is already cut or fixed}
    if FB1.isClicked(p) then
      if FB1.RungIsCut then
        FB1.Fix(Image1.Canvas)
      else
        FB1.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B2 depending on if it is already cut or fixed}
    if FB2.isClicked(p) then
      if FB2.RungIsCut then
        FB2.Fix(Image1.Canvas)
      else
        FB2.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B3 depending on if it is already cut or fixed}
    if FB3.isClicked(p) then
      if FB3.RungIsCut then
        FB3.Fix(Image1.Canvas)
      else
        FB3.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B4 depending on if it is already cut or fixed}
    if FB4.isClicked(p) then
      if FB4.RungIsCut then
        FB4.Fix(Image1.Canvas)
      else
        FB4.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B5 depending on if it is already cut or fixed}
    if FB5.isClicked(p) then
      if FB5.RungIsCut then
        FB5.Fix(Image1.Canvas)
      else
        FB5.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B6 depending on if it is already cut or fixed}
    if FB6.isClicked(p) then
      if FB6.RungIsCut then
        FB6.Fix(Image1.Canvas)
      else
        FB6.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B7 depending on if it is already cut or fixed}
    if FB7.isClicked(p) then
      if FB7.RungIsCut then
        FB7.Fix(Image1.Canvas)
      else
        FB7.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B8 depending on if it is already cut or fixed}
    if FB8.isClicked(p) then
      if FB8.RungIsCut then
        FB8.Fix(Image1.Canvas)
      else
        FB8.Cut(Image1.Canvas);
    {...Checking whether to cut or fix B9 depending on if it is already cut or fixed}
    if FB9.isClicked(p) then
      if FB9.RungIsCut then
        FB9.Fix(Image1.Canvas)
      else
        FB9.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C1 depending on if it is already cut or fixed}
    if FC1.isClicked(p) then
      if FC1.RungIsCut then
        FC1.Fix(Image1.Canvas)
      else
        FC1.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C2 depending on if it is already cut or fixed}
    if FC2.isClicked(p) then
      if FC2.RungIsCut then
        FC2.Fix(Image1.Canvas)
      else
        FC2.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C3 depending on if it is already cut or fixed}
    if FC3.isClicked(p) then
      if FC3.RungIsCut then
        FC3.Fix(Image1.Canvas)
      else
        FC3.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C4 depending on if it is already cut or fixed}
    if FC4.isClicked(p) then
      if FC4.RungIsCut then
        FC4.Fix(Image1.Canvas)
      else
        FC4.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C5 depending on if it is already cut or fixed}
    if FC5.isClicked(p) then
      if FC5.RungIsCut then
        FC5.Fix(Image1.Canvas)
      else
        FC5.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C6 depending on if it is already cut or fixed}
    if FC6.isClicked(p) then
      if FC6.RungIsCut then
        FC6.Fix(Image1.Canvas)
      else
        FC6.Cut(Image1.Canvas);
    {...Checking whether to cut or fix C7 depending on if it is already cut or fixed}
    if FC7.isClicked(p) then
      if FC7.RungIsCut then
        FC7.Fix(Image1.Canvas)
      else
        FC7.Cut(Image1.Canvas);
  end;
end;

(***********************************************************************)
{TCutD01Form.FormCreate}
procedure TCutD01Form.FormCreate(Sender: TObject);
begin
  D01Resistor := TD01Resistor.create;
end;

(***********************************************************************)
{TCutD01Form.FormActivate}
procedure TCutD01Form.FormActivate(Sender: TObject);
var
  i : integer;
  TheItem : TacStreamable;
begin
  TheItem := nil;
  i := 0;
  {...getting item from object if there is one}
  Repeat
    if MainForm.FLog.AtIndex(i) is TD01Resistor then begin
      TheItem := MainForm.FLog.atIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  if TheItem <> nil then begin
    {...Getting A1 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA1.RungIsCut then
      D01Resistor.FA1.Cut(Image1.Canvas)
    else
      D01Resistor.Fa1.Fix(Image1.Canvas);
    {...Getting A2 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA2.RungIsCut then
      D01Resistor.FA2.Cut(Image1.Canvas)
    else
      D01Resistor.Fa2.Fix(Image1.Canvas);
    {...Getting A3 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA3.RungIsCut then
      D01Resistor.FA3.Cut(Image1.Canvas)
    else
      D01Resistor.FA3.Fix(Image1.Canvas);
    {...Getting A4 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA4.RungIsCut then
      D01Resistor.FA4.Cut(Image1.Canvas)
    else
      D01Resistor.FA4.Fix(Image1.Canvas);
    {...Getting A5 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA5.RungIsCut then
      D01Resistor.FA5.Cut(Image1.Canvas)
    else
      D01Resistor.FA5.Fix(Image1.Canvas);
    {...Getting A6 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA6.RungIsCut then
      D01Resistor.FA6.Cut(Image1.Canvas)
    else
      D01Resistor.FA6.Fix(Image1.Canvas);
    {...Getting A7 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FA7.RungIsCut then
      D01Resistor.FA7.Cut(Image1.Canvas)
    else
      D01Resistor.FA7.Fix(Image1.Canvas);
    {...Getting B1 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB1.RungIsCut then
      D01Resistor.FB1.Cut(Image1.Canvas)
    else
      D01Resistor.FB1.Fix(Image1.Canvas);
    {...Getting B2 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB2.RungIsCut then
      D01Resistor.FB2.Cut(Image1.Canvas)
    else
      D01Resistor.FB2.Fix(Image1.Canvas);
    {...Getting B3 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB3.RungIsCut then
      D01Resistor.FB3.Cut(Image1.Canvas)
    else
      D01Resistor.FB3.Fix(Image1.Canvas);
    {...Getting B4 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB4.RungIsCut then
      D01Resistor.FB4.Cut(Image1.Canvas)
    else
      D01Resistor.FB4.Fix(Image1.Canvas);
    {...Getting B5 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB5.RungIsCut then
      D01Resistor.FB5.Cut(Image1.Canvas)
    else
      D01Resistor.FB5.Fix(Image1.Canvas);
    {...Getting B6 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB6.RungIsCut then
      D01Resistor.FB6.Cut(Image1.Canvas)
    else
      D01Resistor.FB6.Fix(Image1.Canvas);
    {...Getting B7 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB7.RungIsCut then
      D01Resistor.FB7.Cut(Image1.Canvas)
    else
      D01Resistor.FB7.Fix(Image1.Canvas);
    {...Getting B8 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB8.RungIsCut then
      D01Resistor.FB8.Cut(Image1.Canvas)
    else
      D01Resistor.FB8.Fix(Image1.Canvas);
    {...Getting B9 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FB9.RungIsCut then
      D01Resistor.FB9.Cut(Image1.Canvas)
    else
      D01Resistor.FB9.Fix(Image1.Canvas);
    {...Getting C1 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC1.RungIsCut then
      D01Resistor.FC1.Cut(Image1.Canvas)
    else
      D01Resistor.FC1.Fix(Image1.Canvas);
    {...Getting C2 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC2.RungIsCut then
      D01Resistor.FC2.Cut(Image1.Canvas)
    else
      D01Resistor.FC2.Fix(Image1.Canvas);
    {...Getting C3 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC3.RungIsCut then
      D01Resistor.FC3.Cut(Image1.Canvas)
    else
      D01Resistor.FC3.Fix(Image1.Canvas);
    {...Getting C4 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC4.RungIsCut then
      D01Resistor.FC4.Cut(Image1.Canvas)
    else
      D01Resistor.FC4.Fix(Image1.Canvas);
    {...Getting C5 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC5.RungIsCut then
      D01Resistor.FC5.Cut(Image1.Canvas)
    else
      D01Resistor.FC5.Fix(Image1.Canvas);
    {...Getting C6 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC6.RungIsCut then
      D01Resistor.FC6.Cut(Image1.Canvas)
    else
      D01Resistor.FC6.Fix(Image1.Canvas);
    {...Getting C7 item from object and Checking whether to cut or fix }
    if (TheItem as TD01Resistor).FC7.RungIsCut then
      D01Resistor.FC7.Cut(Image1.Canvas)
    else
      D01Resistor.FC7.Fix(Image1.Canvas);
  end;
end;

(***********************************************************************)
{TCutD01Form.BN_OKClick}
procedure TCutD01Form.BN_OKClick(Sender: TObject);
var
  i : integer;
begin
  {...placing the fields in the object}
  D01Resistor.FA1.RungIsCut := D01Resistor.FA1.RungIsCut;
  D01Resistor.FA2.RungIsCut := D01Resistor.FA2.RungIsCut;
  D01Resistor.FA3.RungIsCut := D01Resistor.FA3.RungIsCut;
  D01Resistor.FA4.RungIsCut := D01Resistor.FA4.RungIsCut;
  D01Resistor.FA5.RungIsCut := D01Resistor.FA5.RungIsCut;
  D01Resistor.FA6.RungIsCut := D01Resistor.FA6.RungIsCut;
  D01Resistor.FA7.RungIsCut := D01Resistor.FA7.RungIsCut;
  D01Resistor.FB1.RungIsCut := D01Resistor.FB1.RungIsCut;
  D01Resistor.FB2.RungIsCut := D01Resistor.FB2.RungIsCut;
  D01Resistor.FB3.RungIsCut := D01Resistor.FB3.RungIsCut;
  D01Resistor.FB4.RungIsCut := D01Resistor.FB4.RungIsCut;
  D01Resistor.FB5.RungIsCut := D01Resistor.FB5.RungIsCut;
  D01Resistor.FB6.RungIsCut := D01Resistor.FB6.RungIsCut;
  D01Resistor.FB7.RungIsCut := D01Resistor.FB7.RungIsCut;
  D01Resistor.FB8.RungIsCut := D01Resistor.FB8.RungIsCut;
  D01Resistor.FB9.RungIsCut := D01Resistor.FB9.RungIsCut;
  D01Resistor.FC1.RungIsCut := D01Resistor.FC1.RungIsCut;
  D01Resistor.FC2.RungIsCut := D01Resistor.FC2.RungIsCut;
  D01Resistor.FC3.RungIsCut := D01Resistor.FC3.RungIsCut;
  D01Resistor.FC4.RungIsCut := D01Resistor.FC4.RungIsCut;
  D01Resistor.FC5.RungIsCut := D01Resistor.FC5.RungIsCut;
  D01Resistor.FC6.RungIsCut := D01Resistor.FC6.RungIsCut;
  D01Resistor.FC7.RungIsCut := D01Resistor.FC7.RungIsCut;
  MainForm.AddToLog(D01Resistor);
  i := 0;
 (*
  {..placing the object in the outline}
  Repeat
    inc(i);
  until (OutlineFrm.XCalcOutline.Items[i].text = 'Resistor') or (i > OutlineFrm.XCalcOutline.ItemCount);
  OutlineFrm.XCalcOutline.AddChild(i, D01Resistor.GetAsString);
  *)
  close;
end;

begin
  {...Registering the object}
  RegisterClasses([TD01resistor]);
end.
