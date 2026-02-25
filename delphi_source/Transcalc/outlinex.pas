unit Outlinex;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Grids, Outline, ACList, acStream, LogItem,
  LogStrm, Log;

type
  TOutlineFrm = class(TForm)
    XCalcOutline: TOutline;
    procedure XCalcOutlineDblClick(Sender: TObject);
  end;

var
  OutlineFrm: TOutlineFrm;

implementation
uses MainMenu;
{$R *.DFM}

procedure TOutlineFrm.XCalcOutlineDblClick(Sender: TObject);
var
  TheText   : string;
  TheObject : TacStreamable;
begin
  {if outline doubleclicked find string associated with object and show the form}
  TheText := XCalcOutline.items[XCalcOutline.SelectedItem].Text;
  TheObject := MainForm.FLog.AtName(TheText);
  if TheObject is TacStreamable then begin
    TheObject.ShowTheForm;
  end;
end;

end.
