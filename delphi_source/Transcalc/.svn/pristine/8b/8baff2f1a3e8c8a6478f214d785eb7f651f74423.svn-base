(* ********************************************** *)
(* About Box Unit *)
(* ********************************************** *)
unit About;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons;

type
  TAboutForm = class(TForm)
    BN_OK: TBitBtn;
    HiddenButton1: TBitBtn;
    HiddenButton3: TBitBtn;
    HiddenButton4: TBitBtn;
    HiddenButton5: TBitBtn;
    Image2: TImage;
    Image1: TImage;
    Image3: TImage;
    HiddenButton2: TBitBtn;
    procedure BN_OKClick(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure HiddenButton1Click(Sender: TObject);
    procedure HiddenButton2Click(Sender: TObject);
    procedure HiddenButton3Click(Sender: TObject);
    procedure HiddenButton4Click(Sender: TObject);
    procedure HiddenButton5Click(Sender: TObject);
    procedure Image2Click(Sender: TObject);
  end;

var
  AboutForm: TAboutForm;

implementation

{$R *.DFM}


(* ********************************************************************* *)
{ TAboutForm.HiddenButton1Click }
procedure TAboutForm.HiddenButton1Click(Sender: TObject);
begin
  HiddenButton1.visible := false;
  HiddenButton2.visible := true;
end;

(* ********************************************************************* *)
{ TAboutForm.HiddenButton2Click }
procedure TAboutForm.HiddenButton2Click(Sender: TObject);
begin
  HiddenButton2.visible := false;
  HiddenButton3.visible := true;
end;

(* ********************************************************************* *)
{ TAboutForm.HiddenButton3Click }
procedure TAboutForm.HiddenButton3Click(Sender: TObject);
begin
  HiddenButton3.visible := false;
  HiddenButton4.visible := true;
end;

(* ********************************************************************* *)
{ TAboutForm.HiddenButton4Click }
procedure TAboutForm.HiddenButton4Click(Sender: TObject);
begin
  HiddenButton4.visible := false;
  HiddenButton5.visible := true;
end;

(* ********************************************************************* *)
{ TAboutForm.HiddenButton5Click }
procedure TAboutForm.HiddenButton5Click(Sender: TObject);
begin
  HiddenButton5.visible := false;
  Image1.visible := false;
  Image2.visible := true;
end;

(* ********************************************************************* *)
{ TAboutForm.BN_OKClick }
procedure TAboutForm.BN_OKClick(Sender: TObject);
begin
  HiddenButton5.visible := false;
  HiddenButton1.visible := true;
  Image2.visible := false;
  Image1.visible := true;
  close;
end;

(* ********************************************************************* *)
{ TAboutForm.FormClose }
procedure TAboutForm.FormClose(Sender: TObject; var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TAboutForm.Image2Click }
procedure TAboutForm.Image2Click(Sender: TObject);
begin
  Image2.visible := false;
  Image3.visible := true;
end;

end.
