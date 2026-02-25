(***********************************************)
(*  Bridge Menu Item Unit                      *)
(***********************************************)
unit Bridge;

interface

uses WinTypes, WinProcs, Classes, Graphics, Forms, Controls, Buttons,
     StdCtrls, ExtCtrls;

 {$R bridges.res}
 {$I bridges.inc}


(***********************************************)
(*  Bridge Form Object                         *)
(***********************************************)
type
  TBridgeDlg = class(TForm)
    OKBtn: TBitBtn;
    CancelBtn: TBitBtn;
    HelpBtn: TBitBtn;
    Bevel1: TBevel;
    RB_OneActiveHalf: TRadioButton;
    RB_TwoActiveHalf: TRadioButton;
    RB_LinearFull: TRadioButton;
    RB_NonLinearFull: TRadioButton;
    RB_TwoActiveFull: TRadioButton;
    RB_FourActiveFull: TRadioButton;
    Bevel2: TBevel;
    ImageFullActiveFour: TImage;
    ImageFullTwoActive: TImage;
    ImageFullLinear: TImage;
    ImageFullNonLinear: TImage;
    ImageHalf1Active1Poisson: TImage;
    ImageHalf2Active: TImage;
    procedure RB_FourActiveFullClick(Sender: TObject);
    procedure RB_TwoActiveFullClick(Sender: TObject);
    procedure RB_LinearFullClick(Sender: TObject);
    procedure RB_NonLinearFullClick(Sender: TObject);
    procedure RB_OneActiveHalfClick(Sender: TObject);
    procedure RB_TwoActiveHalfClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure OKBtnClick(Sender: TObject);
    procedure CancelBtnClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure HelpBtnClick(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
    BridgeDlgShowing : boolean;
  end;

var
  BridgeDlg: TBridgeDlg;

(***********************************************)
(*  Bridge Form Object Methods                 *)
(***********************************************)

implementation
uses FullFour, {MainMenu,} FullTwo, TwoAdj, Linear, NonLine, Active11;
{$R *.DFM}

(***********************************************************************)
{TBridgeDlg.RB_FourActiveFullClick}
procedure TBridgeDlg.RB_FourActiveFullClick(Sender: TObject);
begin
  RB_FourActiveFull.checked := true;
  ImageFullActiveFour.visible := true;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := false;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.RB_TwoActiveFullClick}
procedure TBridgeDlg.RB_TwoActiveFullClick(Sender: TObject);
begin
  RB_TwoActiveFull.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := true;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := false;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.RB_LinearFullClick}
procedure TBridgeDlg.RB_LinearFullClick(Sender: TObject);
begin
  RB_LinearFull.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := true;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := false;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.RB_NonLinearFullClick}
procedure TBridgeDlg.RB_NonLinearFullClick(Sender: TObject);
begin
  RB_NonLinearFull.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := true;
  ImageHalf1Active1Poisson.visible := false;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.RB_OneActiveHalfClick}
procedure TBridgeDlg.RB_OneActiveHalfClick(Sender: TObject);
begin
  RB_OneActiveHalf.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := true;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.RB_TwoActiveHalfClick}
procedure TBridgeDlg.RB_TwoActiveHalfClick(Sender: TObject);
begin
  RB_TwoActiveHalf.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := false;
  ImageHalf2Active.visible := true;
end;

(***********************************************************************)
{TBridgeDlg.FormActivate}
procedure TBridgeDlg.FormActivate(Sender: TObject);
begin
  RB_OneActiveHalf.checked := true;
  ImageFullActiveFour.visible := false;
  ImageFullTwoActive.visible := false;
  ImageFullLinear.visible := false;
  ImageFullNonLinear.visible := false;
  ImageHalf1Active1Poisson.visible := true;
  ImageHalf2Active.visible := false;
end;

(***********************************************************************)
{TBridgeDlg.OKBtnClick}
procedure TBridgeDlg.OKBtnClick(Sender: TObject);
begin
  BridgeDlgShowing := true;
  if RB_OneActiveHalf.checked = true then begin
    Application.CreateForm(TOneActiveOnePoissonFrm, OneActiveOnePoissonFrm);
    OneActiveOnePoissonFrm.showmodal;
  end
  else if RB_TwoActiveHalf.checked = true then begin
    Application.CreateForm(TTwoAdjActiveForm, TwoAdjActiveForm);
    TwoAdjActiveForm.showmodal;
  end
  else if RB_LinearFull.checked = true then begin
    Application.CreateForm(TLinearPoissonForm, LinearPoissonForm);
    LinearPoissonForm.showmodal;
  end
  else if RB_NonLinearFull.checked = true then begin
    Application.CreateForm(TNonLinearForm, NonLinearForm);
    NonLinearForm.showmodal;
  end
  else if RB_TwoActiveFull.checked = true then begin
    Application.CreateForm(TTwoActiveOppForm, TwoActiveOppForm);
    TwoActiveOppForm.showmodal;
  end
  else if RB_FourActiveFull.checked = true then begin
    Application.CreateForm(TFull4ActiveForm, Full4ActiveForm);
    Full4ActiveForm.showmodal;
  end;
end;

(***********************************************************************)
{TBridgeDlg.CancelBtnClick}
procedure TBridgeDlg.CancelBtnClick(Sender: TObject);
begin
  {MainForm.Bridge1.enabled := true;}
  Close;
end;

(***********************************************************************)
{TBridgeDlg.FormCreate}
procedure TBridgeDlg.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(***********************************************************************)
{TBridgeDlg.FormClose}
procedure TBridgeDlg.FormClose(Sender: TObject; var Action: TCloseAction);
begin
  BridgeDlgShowing := false;
  Release;
end;

procedure TBridgeDlg.HelpBtnClick(Sender: TObject);
begin
  Application.HelpContext(10100);
end;

end.
