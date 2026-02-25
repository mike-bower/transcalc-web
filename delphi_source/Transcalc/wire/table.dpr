program Table;
                        
uses
  Forms,
  WIRETBL in 'WIRETBL.PAS' {WireTableForm},
  CONVERT in '..\CONVERT.PAS';

{$R *.RES}

begin
  Application.Title := 'Wire Table';
  Application.HelpFile := 'XCALC.HLP';
  Application.CreateForm(TWireTableForm, WireTableForm);
  Application.Run;
end.
