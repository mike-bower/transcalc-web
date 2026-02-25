(* ***************************************** *)
(* Compensation Form Unit *)
(* ***************************************** *)
unit Compenst;

interface

uses WinTypes, WinProcs, Classes, Graphics, Forms, Controls, Buttons,
  StdCtrls, ExtCtrls;

(* ******************************************* *)
(* Compensation Form Object *)
(* ******************************************* *)
type
  TCompensationDlg = class(TForm)
    OKBtn: TBitBtn;
    CancelBtn: TBitBtn;
    HelpBtn: TBitBtn;
    Bevel1: TBevel;
    RB_ZerovsTemp: TRadioButton;
    RB_ZeroBalance: TRadioButton;
    RB_SVsTTwoPt: TRadioButton;
    RB_SvsTThreept: TRadioButton;
    RB_SvsTOptimum: TRadioButton;
    RB_SpanSet: TRadioButton;
    RB_Simulanteous: TRadioButton;
    ImageOptShunt: TImage;
    ImageSpanSpan: TImage;
    ImageSpanSet: TImage;
    ImageSpanTemp2pt: TImage;
    ImageSpanTemp3pt: TImage;
    Image0vsTemp: TImage;
    ImageZeroBalance: TImage;
    procedure FormActivate(Sender: TObject);
    procedure RB_ZerovsTempClick(Sender: TObject);
    procedure RB_ZeroBalanceClick(Sender: TObject);
    procedure RB_SVsTTwoPtClick(Sender: TObject);
    procedure RB_SvsTThreeptClick(Sender: TObject);
    procedure RB_SvsTOptimumClick(Sender: TObject);
    procedure RB_SpanSetClick(Sender: TObject);
    procedure OKBtnClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure RB_SimulanteousClick(Sender: TObject);
    procedure HelpBtnClick(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  CompensationDlg: TCompensationDlg;

implementation

uses Zvstemp, ZeroBal, Span2Pt, Span3Pt, OptShunt, SpanSet, SimSpan, MainMenu;
{$R *.DFM}

(* ********************************************* *)
(* Compensation Form Object Methods *)
(* ********************************************* *)

(* *************************************************************** *)
{ TCompensationDlg.FormActivate }
procedure TCompensationDlg.FormActivate(Sender: TObject);
begin
  RB_ZeroBalance.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := true;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_ZerovsTempClick }
procedure TCompensationDlg.RB_ZerovsTempClick(Sender: TObject);
begin
  RB_ZerovsTemp.checked := true;
  Image0vsTemp.visible := true;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_ZeroBalanceClick }
procedure TCompensationDlg.RB_ZeroBalanceClick(Sender: TObject);
begin
  RB_ZeroBalance.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := true;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_SVsTTwoPtClick }
procedure TCompensationDlg.RB_SVsTTwoPtClick(Sender: TObject);
begin
  RB_SVsTTwoPt.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := true;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_SvsTThreeptClick }
procedure TCompensationDlg.RB_SvsTThreeptClick(Sender: TObject);
begin
  RB_SvsTThreept.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := true;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_SvsTOptimumClick }
procedure TCompensationDlg.RB_SvsTOptimumClick(Sender: TObject);
begin
  RB_SvsTOptimum.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := true;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_SpanSetClick }
procedure TCompensationDlg.RB_SpanSetClick(Sender: TObject);
begin
  RB_SpanSet.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := true;
  ImageSpanSpan.visible := false;
end;

(* *************************************************************** *)
{ TCompensationDlg.OKBtnClick }
procedure TCompensationDlg.OKBtnClick(Sender: TObject);
begin
  MainForm.CompDlgShowing := true;
  if RB_ZerovsTemp.checked = true then
  begin
    Application.CreateForm(TZeroVsTempDlg, ZeroVsTempDlg);
    ZeroVsTempDlg.showmodal;
  end
  else if RB_ZeroBalance.checked = true then
  begin
    Application.CreateForm(TZeroBalanceFrm, ZeroBalanceFrm);
    ZeroBalanceFrm.showmodal;
  end
  else if RB_SVsTTwoPt.checked = true then
  begin
    Application.CreateForm(TSvsTTwoPtForm, SvsTTwoPtForm);
    SvsTTwoPtForm.showmodal;
  end
  else if RB_SvsTThreept.checked = true then
  begin
    Application.CreateForm(TSpan3PtForm, Span3PtForm);
    Span3PtForm.showmodal;
  end
  else if RB_SvsTOptimum.checked = true then
  begin
    Application.CreateForm(TOptShuntForm, OptShuntForm);
    OptShuntForm.showmodal;
  end
  else if RB_SpanSet.checked = true then
  begin
    Application.CreateForm(TSpanSetForm, SpanSetForm);
    SpanSetForm.showmodal;
  end
  else if RB_Simulanteous.checked = true then
  begin
    Application.CreateForm(TSimulSpanForm, SimulSpanForm);
    SimulSpanForm.showmodal;
  end;
end;

(* *************************************************************** *)
{ TCompensationDlg.FormCreate }
procedure TCompensationDlg.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* *************************************************************** *)
{ TCompensationDlg.FormClose }
procedure TCompensationDlg.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  MainForm.CompDlgShowing := false;
  Release;
end;

(* *************************************************************** *)
{ TCompensationDlg.RB_SimulanteousClick }
procedure TCompensationDlg.RB_SimulanteousClick(Sender: TObject);
begin
  RB_Simulanteous.checked := true;
  Image0vsTemp.visible := false;
  ImageZeroBalance.visible := false;
  ImageSpanTemp2pt.visible := false;
  ImageSpanTemp3pt.visible := false;
  ImageOptShunt.visible := false;
  ImageSpanSet.visible := false;
  ImageSpanSpan.visible := true;
end;

(* *************************************************************** *)
{ TCompensationDlg.HelpBtnClick }
procedure TCompensationDlg.HelpBtnClick(Sender: TObject);
begin
  Application.HelpContext(2000);
end;

end.
