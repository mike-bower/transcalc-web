(* ********************************************** *)
(* Cpattern Unit *)
(* ********************************************** *)
unit Cpattern;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

{$R Patterns.res}


type
  TCPatternForm = class(TForm)
    Panel1: TPanel;
    BN_OK: TBitBtn;
    BN_Cut: TBitBtn;
    RB_C11Pattern: TRadioButton;
    RB_C1210Pattern: TRadioButton;
    RB_C1220Pattern: TRadioButton;
    RB_C13Pattern: TRadioButton;
    RadioGroup1: TRadioGroup;
    Panel2: TPanel;
    Panel3: TPanel;
    Image1: TImage;
    BN_Help: TBitBtn;
    Label1: TLabel;
    Label2: TLabel;
    procedure showformmodal(TheSource: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure BN_CutClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure RB_C11PatternClick(Sender: TObject);
    procedure RB_C1210PatternClick(Sender: TObject);
    procedure RB_C1220PatternClick(Sender: TObject);
    procedure RB_C13PatternClick(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure BN_HelpClick(Sender: TObject);
  private
    FormCalled: TObject;
    Bmp: TBitmap;
{$IFDEF RESOURCE_IN_DLL}
    Handle: THandle;
{$ENDIF}
  end;

var
  CPatternForm: TCPatternForm;

implementation

uses Optshc01, span2c01, span3c01, spansc13, OptShunt, Span3pt, Span2pt,
  span2c11,
  span3c11, optshc11, Spn21210, Spn31210, Opsh1210, spn21220, spn31220,
  Opsh1220,
  SimSpan, SpansC11, Spns1210, Spns1220;

{$R *.DFM}


(* ********************************************************************* *)
{ TCPatternForm.showformmodal }
procedure TCPatternForm.showformmodal(TheSource: TObject);
begin
  FormCalled := TheSource;
  RB_C11Pattern.checked := true;
  showmodal;
end;

(* ********************************************************************* *)
{ TCPatternForm.BN_OKClick }
procedure TCPatternForm.BN_OKClick(Sender: TObject);
begin
  close;
end;

(* ********************************************************************* *)
{ TCPatternForm.BN_CutClick }
procedure TCPatternForm.BN_CutClick(Sender: TObject);
begin
  { RB_C11 checked }
  if RB_C11Pattern.checked = true then
  begin
    if (FormCalled = Span3ptForm) then
    begin
      close;
      Application.CreateForm(TSpan3PtC11Form, Span3PtC11Form);
      Span3PtC11Form.showmodal;
    end
    else if (FormCalled = SvsTTwoPtForm) then
    begin
      close;
      Application.CreateForm(TSpan2PtC11Form, Span2PtC11Form);
      Span2PtC11Form.showmodal;
    end
    else if (FormCalled = OptShuntForm) then
    begin
      close;
      Application.CreateForm(TOptShuntC11Form, OptShuntC11Form);
      OptShuntC11Form.showmodal;
    end
    else if (FormCalled = SimulSpanForm) then
    begin
      close;
      Application.CreateForm(TSpanSpanC11Form, SpanSpanC11Form);
      SpanSpanC11Form.showmodal;
    end;
  end
  { RB_C1210 checked }
  else if RB_C1210Pattern.checked = true then
  begin
    if (FormCalled = Span3ptForm) then
    begin
      close;
      Application.CreateForm(TSpan3ptC1210Form, Span3ptC1210Form);
      Span3ptC1210Form.showmodal;
    end
    else if (FormCalled = SvsTTwoPtForm) then
    begin
      close;
      Application.CreateForm(TSpan2ptC1210Form, Span2ptC1210Form);
      Span2ptC1210Form.showmodal;
    end
    else if (FormCalled = OptShuntForm) then
    begin
      close;
      Application.CreateForm(TOptShuntC1210Form, OptShuntC1210Form);
      OptShuntC1210Form.showmodal;
    end
    else if (FormCalled = SimulSpanForm) then
    begin
      close;
      Application.CreateForm(TSpanSpanC1210Form, SpanSpanC1210Form);
      SpanSpanC1210Form.showmodal;
    end;
  end
  { RB_C1220 checked }
  else if RB_C1220Pattern.checked = true then
  begin
    if (FormCalled = Span3ptForm) then
    begin
      close;
      Application.CreateForm(TSpan3PtC1220Form, Span3PtC1220Form);
      Span3PtC1220Form.showmodal;
    end
    else if (FormCalled = SvsTTwoPtForm) then
    begin
      close;
      Application.CreateForm(TSpan2PtC1220Form, Span2PtC1220Form);
      Span2PtC1220Form.showmodal;
    end
    else if (FormCalled = OptShuntForm) then
    begin
      close;
      Application.CreateForm(TOptShuntC1220Form, OptShuntC1220Form);
      OptShuntC1220Form.showmodal;
    end
    else if (FormCalled = SimulSpanForm) then
    begin
      close;
      Application.CreateForm(TSpanSpanC1220Form, SpanSpanC1220Form);
      SpanSpanC1220Form.showmodal;
    end;
  end
  { RB_C13 checked }
  else if RB_C13Pattern.checked = true then
  begin
    if (FormCalled = Span3ptForm) then
    begin
      close;
      Application.CreateForm(TSpan3PtC01Form, Span3PtC01Form);
      Span3PtC01Form.showmodal;
    end
    else if (FormCalled = SvsTTwoPtForm) then
    begin
      close;
      Application.CreateForm(TSpan2PtC01Form, Span2PtC01Form);
      Span2PtC01Form.showmodal;
    end
    else if (FormCalled = OptShuntForm) then
    begin
      close;
      Application.CreateForm(TOptShuntCutC01Frm, OptShuntCutC01Frm);
      OptShuntCutC01Frm.showmodal;
    end
    else if (FormCalled = SimulSpanForm) then
    begin
      close;
      Application.CreateForm(TSpanSpanC01Form, SpanSpanC01Form);
      SpanSpanC01Form.showmodal;
    end;
  end;
end;

(* ********************************************************************* *)
{ TCPatternForm.FormCreate }
procedure TCPatternForm.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TCPatternForm.RB_C11PatternClick }
procedure TCPatternForm.RB_C11PatternClick(Sender: TObject);
begin
  Bmp.free;
  Bmp := TBitmap.Create;
  Bmp.Handle := LoadBitmap(hInstance, 'CUTC11BITMAP');
  try
    Image1.Canvas.Draw(0, 0, Bmp);
  except
    Bmp.free;
  end;
end;

(* ********************************************************************* *)
{ TCPatternForm.RB_C1210PatternClick }
procedure TCPatternForm.RB_C1210PatternClick(Sender: TObject);
begin
  Bmp.free;
  Bmp := TBitmap.Create;
  Bmp.Handle := LoadBitmap(hInstance, 'CUTC1210BITMAP');
  try
    Image1.Canvas.Draw(0, 0, Bmp);
  except
    Bmp.free;
  end;
end;

(* ********************************************************************* *)
{ TCPatternForm.RB_C1220PatternClick }
procedure TCPatternForm.RB_C1220PatternClick(Sender: TObject);
begin
  Bmp.free;
  Bmp := TBitmap.Create;
  Bmp.Handle := LoadBitmap(hInstance, 'CUTC1220BITMAP');
  try
    Image1.Canvas.Draw(0, 0, Bmp);
  except
    Bmp.free;
  end;
end;

(* ********************************************************************* *)
{ TCPatternForm.RB_C13PatternClick }
procedure TCPatternForm.RB_C13PatternClick(Sender: TObject);
begin
  Bmp.free;
  Bmp := TBitmap.Create;
  Bmp.Handle := LoadBitmap(hInstance, 'CUTC13BITMAP');
  try
    Image1.Canvas.Draw(0, 0, Bmp);
  except
    Bmp.free;
  end;
end;

(* ********************************************************************* *)
{ TCPatternForm.FormClose }
procedure TCPatternForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Bmp.free;
  Release;
end;

procedure TCPatternForm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3030);
end;

end.
