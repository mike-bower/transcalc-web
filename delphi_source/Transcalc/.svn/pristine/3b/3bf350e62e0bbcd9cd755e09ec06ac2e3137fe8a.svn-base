unit Example;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  Forms, Dialogs, StdCtrls, Buttons, ExtCtrls;

type
  TZeroVsTempDlg = class(TForm)
    RB_E01Resistor: TRadioButton;
    RB_Wire: TRadioButton;
    E01Image: TImage;
    RadioGroup1: TRadioGroup;
    Panel1: TPanel;
    Image_E01: TImage;
    BN_Resistor: TBitBtn;
    Image_WireTable: TImage;
    procedure FormCreate(Sender: TObject);
    procedure RB_E01ResistorClick(Sender: TObject);
    procedure RB_WireClick(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  ZeroVsTempDlg: TZeroVsTempDlg;

implementation

{$R *.DFM}

procedure TZeroVsTempDlg.FormCreate(Sender: TObject);
begin
  RB_E01Resistor.checked := true;
  Image_E01.visible := true
  Image_WireTabble.visible := false;
end;

procedure TZeroVsTempDlg.RB_E01ResistorClick(Sender: TObject);
begin
  RB_E01Resistor.checked := true;
  Image_E01.visible := true;
  Image_WireTable.visible := false;
end;

procedure TZeroVsTempDlg.RB_WireClick(Sender: TObject);
begin
  RB_Wire.checked := true;
  Image_E01.visible := false;
  Image_WireTable.visible := true;
end;

end.
