(* ********************************************* *)
(* Diapragm Unit *)
(* ********************************************* *)
unit Diapragm;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

type
  TStrainDistForm = class(TForm)
    BN_OK: TBitBtn;
    BN_Help: TBitBtn;
    Image1: TImage;
    procedure BN_OKClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure BN_HelpClick(Sender: TObject);
  end;

var
  StrainDistForm: TStrainDistForm;

implementation

{$R *.DFM}


(* ********************************************************************* *)
{ TDesignDlg.BN_OKClick }
procedure TStrainDistForm.BN_OKClick(Sender: TObject);
begin
  close;
end;

(* ********************************************************************* *)
{ TDesignDlg.FormCreate }
procedure TStrainDistForm.FormCreate(Sender: TObject);
begin
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TDesignDlg.FormClose }
procedure TStrainDistForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TDesignDlg.BN_HelpClick }
procedure TStrainDistForm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(1150);
end;

end.
