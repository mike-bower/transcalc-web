program Bridgeap;

uses
  Forms,
  BRIDGE in 'BRIDGE.PAS' {BridgeDlg},
  ACTIVE11 in 'ACTIVE11.PAS' {OneActiveOnePoissonFrm},
  FULLFOUR in 'FULLFOUR.PAS' {Full4ActiveForm},
  FULLTWO in 'FULLTWO.PAS' {TwoActiveOppForm},
  LINEAR in 'LINEAR.PAS' {LinearPoissonForm},
  NONLINE in 'NONLINE.PAS' {NonLinearForm},
  TWOADJ in 'TWOADJ.PAS' {TwoAdjActiveForm},
  CONVERT in '..\CONVERT.PAS';

{$R *.RES}
                
begin
  Application.Title := 'Bridge Configurations';
  Application.HelpFile := 'XCALC.HLP';
  Application.CreateForm(TBridgeDlg, BridgeDlg);
  Application.Run;
end.
