program Tcrcalc;

uses
  Forms,
  TCRATIO in 'TCRatio.pas' {Form1},
  CONVERT in 'CONVERT.PAS';

{$R *.RES}

begin
  Application.Title := 'Resistance Ratios';
  Application.HelpFile := 'XCALC.HLP';
  Application.CreateForm(TForm1, Form1);
  Application.Run;
end.
