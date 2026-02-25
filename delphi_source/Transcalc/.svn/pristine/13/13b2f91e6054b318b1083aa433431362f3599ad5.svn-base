(* ********************************************** *)
(* Apattern Unit *)
(* ********************************************** *)
unit Apattern;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

type
  TAPatternForm = class(TForm)
    BN_OK: TBitBtn;
    Panel1: TPanel;
    Image1: TImage;
    BN_Help: TBitBtn;
    Label1: TLabel;
    Label2: TLabel;
    procedure BN_OKClick(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure FormCreate(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
  end;

var
  APatternForm: TAPatternForm;

implementation

{$R *.DFM}


(* ********************************************************************* *)
{ TAPatternForm.BN_OKClick }
procedure TAPatternForm.BN_OKClick(Sender: TObject);
begin
  close;
end;

(* ********************************************************************* *)
{ TAPatternForm.FormClose }
procedure TAPatternForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TAPatternForm.FormCreate }
procedure TAPatternForm.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TAPatternForm.BN_HelpClick }
procedure TAPatternForm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(3010);
end;

end.
