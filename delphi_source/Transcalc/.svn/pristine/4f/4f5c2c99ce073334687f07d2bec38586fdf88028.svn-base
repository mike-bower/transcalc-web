(* ********************************************** *)
(* Bpattern Unit *)
(* ********************************************** *)
unit Bpattern;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

type
  TBPatternForm = class(TForm)
    BN_OK: TBitBtn;
    Panel1: TPanel;
    Image1: TImage;
    BN_Help: TBitBtn;
    Label1: TLabel;
    Label2: TLabel;
    procedure BN_OKClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure BN_HelpClick(Sender: TObject);
  end;

var
  BPatternForm: TBPatternForm;

implementation

{$R *.DFM}


(* ********************************************************************* *)
{ TBPatternForm.BN_OKClick }
procedure TBPatternForm.BN_OKClick(Sender: TObject);
begin
  close;
end;

(* ********************************************************************* *)
{ TBPatternForm.FormCreate }
procedure TBPatternForm.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TBPatternForm.FormClose }
procedure TBPatternForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TBPatternForm.BN_HelpClick }
procedure TBPatternForm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3020);
end;

end.
