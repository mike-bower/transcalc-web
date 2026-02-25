unit Main;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  Forms, Dialogs, StdCtrls, Buttons, ExtCtrls, Menus;

type
  TMainForm = class(TForm)
    MainMenu: TMainMenu;
    FileNewItem: TMenuItem;
    FileOpenItem: TMenuItem;
    FileSaveItem: TMenuItem;
    FileSaveAsItem: TMenuItem;
    FilePrintItem: TMenuItem;
    FilePrintSetupItem: TMenuItem;
    FileExitItem: TMenuItem;
    OpenDialog: TOpenDialog;
    SaveDialog: TSaveDialog;
    PrintDialog: TPrintDialog;
    PrintSetupDialog: TPrinterSetupDialog;
    SpeedBar: TPanel;
    SpeedButton1: TSpeedButton;  { &New }
    SpeedButton2: TSpeedButton;  { &Open... }
    SpeedButton3: TSpeedButton;  { Save &As... }
    procedure FileNew(Sender: TObject);
    procedure FileOpen(Sender: TObject);
    procedure FileSave(Sender: TObject);
    procedure FileSaveAs(Sender: TObject);
    procedure FilePrint(Sender: TObject);
    procedure FilePrintSetup(Sender: TObject);
    procedure FileExit(Sender: TObject);
  end;

var
  MainForm: TMainForm;

implementation

uses
  BBCant;

{$R *.DFM}

procedure TMainForm.FileNew(Sender: TObject);
begin
  { Add code to create a new file }
  CantileverBBFrm.Show;
end;

procedure TMainForm.FileOpen(Sender: TObject);
var
  Editstrings : string;
begin
  if OpenDialog.Execute then begin
    { Add code to open OpenDialog.FileName }
    if OpenDialog.FileName[0] <> #0 then begin
      CantileverBBFrm.CantBeamObject := TCantileverBeam.create;
      CantileverBBFrm.CantBeamObject.LoadFromFile(OpenDialog.Filename);
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.AppliedLoad);
      CantileverBBFrm.EB_AppliedLoad.text := EditStrings;
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.BeamWidth);
      CantileverBBFrm.EB_BeamWidth.text := EditStrings;
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.Thickness);
      CantileverBBFrm.EB_Thickness.text := EditStrings;
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.MomentArm);
      CantileverBBFrm.EB_MomentArm.text := EditStrings;
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.Modulus);
      CantileverBBFrm.EB_Modulus.text := EditStrings;
      EditStrings := floattostr(CantileverBBFrm.CantBeamObject.GageLength);
      CantileverBBFrm.EB_GageLength.text := EditStrings;
    end;
  end;
end;

procedure TMainForm.FileSave(Sender: TObject);
begin
   { Add code to save current file under current name }
end;

procedure TMainForm.FileSaveAs(Sender: TObject);
begin
  if SaveDialog.Execute then
  begin
    { Add code to save current file under SaveDialog.FileName }
    CantileverBBFrm.CantBeamObject.SaveToFile(SaveDialog.Filename);
  end;
end;

procedure TMainForm.FilePrint(Sender: TObject);
begin
  if PrintDialog.Execute then
  begin
    { Add code to print current file }
  end;
end;

procedure TMainForm.FilePrintSetup(Sender: TObject);
begin
  PrintSetupDialog.Execute;
end;

procedure TMainForm.FileExit(Sender: TObject);
begin
  Close;
end;

end.
