(***********************************************)
(*  Zero vs. Temperature Wire Table Unit       *)
(***********************************************)
unit Wiretbl;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Grids, Buttons, system.IOUtils, system.IniFiles;

{$R wirestr.res}
{$I wirestr.inc}

type
  RealType = double;

(***********************************************)
(* Zero vs. Temperature Wire Table Object      *)
(***********************************************)
type
  TableEntry = record
  AWG   : RealType;
  d     : RealType;
  cmils : RealType;
end;

const
  MAXTEXTLENGTH =  80;
  MAXERRORLENGTH = 255;
  AWGlo = 1;
  AWGhi = 41;

  table: array[AWGLo..AWGHi] of tableentry = (
  (AWG:10; d:0.1019; cmils:10380),
  (AWG:11; d:0.0907; cmils:8230),
  (AWG:12; d:0.0808; cmils:6530),
  (AWG:13; d:0.0720; cmils:5190),
  (AWG:14; d:0.0641; cmils:4110),
  (AWG:15; d:0.0571; cmils:3260),
  (AWG:16; d:0.0508; cmils:2580),
  (AWG:17; d:0.0453; cmils:2050),
  (AWG:18; d:0.0403; cmils:1620),
  (AWG:19; d:0.0359; cmils:1290),
  (AWG:20; d:0.0320; cmils:1020),
  (AWG:21; d:0.0285; cmils:812),
  (AWG:22; d:0.0253; cmils:640),
  (AWG:23; d:0.0226; cmils:510),
  (AWG:24; d:0.0201; cmils:404),
  (AWG:25; d:0.0179; cmils:320),
  (AWG:26; d:0.0159; cmils:253),
  (AWG:27; d:0.0142; cmils:202),
  (AWG:28; d:0.0126; cmils:158.8),
  (AWG:29; d:0.0113; cmils:127.7),
  (AWG:30; d:0.0100; cmils:100.0),
  (AWG:31; d:0.0089; cmils:79.21),
  (AWG:32; d:0.0080; cmils:64.00),
  (AWG:33; d:0.0071; cmils:50.41),
  (AWG:34; d:0.0063; cmils:39.69),
  (AWG:35; d:0.0056; cmils:31.36),
  (AWG:36; d:0.0050; cmils:25.00),
  (AWG:37; d:0.0045; cmils:20.25),
  (AWG:38; d:0.0040; cmils:16.00),
  (AWG:39; d:0.0035; cmils:12.25),
  (AWG:40; d:0.0031; cmils:9.61),
  (AWG:41; d:0.0028; cmils:7.84),
  (AWG:42; d:0.0025; cmils:6.25),
  (AWG:43; d:0.0022; cmils:5.84),
  (AWG:44; d:0.0020; cmils:4.00),
  (AWG:45; d:0.00176; cmils:3.10),
  (AWG:46; d:0.00157; cmils:2.47),
  (AWG:47; d:0.00140; cmils:1.96),
  (AWG:48; d:0.00124; cmils:1.54),
  (AWG:49; d:0.00111; cmils:1.23),
  (AWG:50; d:0.00099; cmils:0.980));


{ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - }
{ Wire Object Definition }
type
   TWire  = class(Tobject)
    Name       : string;
    Resistivity: real;
    TCR        : real;
  end;



(***********************************************)
(* Zero vs. Temperature Wire Table Form Object *)
(***********************************************)
type
  TWireTableForm = class(TForm)
    Panel1: TPanel;
    Image1: TImage;
    Panel2: TPanel;
    CB_WireType: TComboBox;
    Label1: TLabel;
    Panel3: TPanel;
    Panel7: TPanel;
    Label6: TLabel;
    RB_Resistance: TRadioButton;
    RB_Length: TRadioButton;
    ST_Input: TLabel;
    EB_Input: TEdit;
    Results: TGroupBox;
    ST_OutputLabel: TLabel;
    ST_Answer: TLabel;
    WireGrid: TStringGrid;
    TitleGrid: TStringGrid;
    BN_OK: TBitBtn;
    BN_Help: TBitBtn;
    ST_InputUnits: TLabel;
    ST_AnswerUnits: TLabel;
    BN_Compute: TBitBtn;
    procedure RB_ResistanceClick(Sender: TObject);
    procedure RB_LengthClick(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure ReCalculate;
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure CB_WireTypeChange(Sender: TObject);
    procedure BN_ComputeClick(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
    procedure WireGridSelectCell(Sender: TObject; ACol, ARow: Integer;
      var CanSelect: Boolean);
  private
    SolveForText        : string;
    TheType             : integer;
    ExceptionRaised     : boolean;
    IsThereAnError      : boolean;
    UnitsAreUS          : boolean;
    IniFileName: string;
    IniFile: TIniFile;
  public
    Wire             : TWire;
  end;

var
  WireTableForm: TWireTableForm;

implementation
uses  Convert;
{$R *.DFM}


(***********************************************)
(*  Wire Table Form Methods                    *)
(***********************************************)

(***********************************************************************)
{TWireTableForm.RB_ResistanceClick}
procedure TWireTableForm.RB_ResistanceClick(Sender: TObject);
var
  LengthUnit   : array[0..MAXTEXTLENGTH-1] of char;
  OhmsUnit     : array[0..MAXTEXTLENGTH-1] of char;
begin
  if RB_Resistance.checked = true then begin
    ST_Input.caption := 'Length:';
    ST_OutputLabel.caption := 'Resistance:';
    SolveForText := 'Resistance';
    {...determining whether to place STd or SI values in the Form's units}
    if UnitsAreUS = true then begin
      LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
      LoadString(hinstance, ID_SZ_Inches, LengthUnit, sizeof(LengthUnit));
    end
    else begin
      LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
      LoadString(hinstance, ID_SZ_MM, LengthUnit, sizeof(LengthUnit));
    end;
    ST_InputUnits.caption := LengthUnit;
    ST_AnswerUnits.caption := OhmsUnit;
  end;
  EB_Input.setfocus;
  EB_Input.clearselection;
  ST_Answer.caption := '';
end;

(***********************************************************************)
{TWireTableForm.RB_LengthClick}
procedure TWireTableForm.RB_LengthClick(Sender: TObject);
var
  LengthUnit   : array[0..MAXTEXTLENGTH-1] of char;
  OhmsUnit     : array[0..MAXTEXTLENGTH-1] of char;
begin
  if RB_Length.checked = true then begin
    ST_Input.caption := 'Resistance:';
    ST_OutputLabel.caption := 'Length:';
    SolveForText := 'Length';
    {...determining whether to place STd or SI values in the Form's units}
    if UnitsAreUS = true then begin
      LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
      LoadString(hinstance, ID_SZ_Inches, LengthUnit, sizeof(LengthUnit));
    end
    else begin
      LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
      LoadString(hinstance, ID_SZ_MM, LengthUnit, sizeof(LengthUnit));
    end;
    ST_InputUnits.caption := OhmsUnit;
    ST_AnswerUnits.caption := LengthUnit;
  end;
  EB_Input.setfocus;
  EB_Input.clearselection;
  ST_Answer.caption := '';
end;

(***********************************************************************)
{TWireTableForm.FormShow}
procedure TWireTableForm.FormShow(Sender: TObject);
begin
  RB_Length.checked := true;
  if UnitsAreUS = true then begin
    TitleGrid.Cells[0,0] := 'Diameter';
    WireGrid.Cells[0,0] := '   in.';
    TitleGrid.Cells[1,0] := '     AWG';
    TitleGrid.Cells[2,0] := ' Resistance';
    WireGrid.Cells[2,0] := ' Ohms/ft';
    TitleGrid.Cells[3,0] := '   TCR';
    WireGrid.Cells[3,0] := '  %/°F';
  end
  else begin
    TitleGrid.Cells[0,0] := 'Diameter';
    WireGrid.Cells[0,0] := '   mm.';
    TitleGrid.Cells[1,0] := '     AWG';
    TitleGrid.Cells[2,0] := ' Resistance ';
    WireGrid.Cells[2,0] := ' Ohms/m';
    TitleGrid.Cells[3,0] := '   TCR';
    WireGrid.Cells[3,0] := '  %/°C';
  end;
end;

(***********************************************************************)
{TWireTableForm.FormCreate}
procedure TWireTableForm.FormCreate(Sender: TObject);
var

  IniPath : string ;
  Cs : string;
begin
  {..setting font so will resize in different resolutions}
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;

   CreateDir(tPath.Combine(system.IOUtils.TPath.GetPublicPath,'Micro-Measurements')) ;
   IniPath := tPath.Combine( tPath.Combine(system.IOUtils.TPath.GetPublicPath(),'Micro-Measurements'),'xcalc') ;
   CreateDir(iniPath) ;
   IniFileName := tPath.Combine( IniPath, 'xcalc.ini') ;

   IniFile := tIniFile.Create(IniFileName);
   cs := IniFile.ReadString('Units', 'Units', 'US') ;

  if (cs = 'US') then begin
    UnitsAreUS := true;
  end
  else begin
    UnitsAreUS := false;
  end;

end;


(***********************************************************************)
{TWireTableForm.FormClose}
procedure TWireTableForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(***********************************************************************)
{TWireTableForm.FormActivate}
procedure TWireTableForm.FormActivate(Sender: TObject);
var
  EditStrings  : string;
  i            : integer;
  TheItems     : string;
begin
  CB_WireType.itemindex := 0;
  {getting item from object if there is one}
  i := 0;
  {...add 1st Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[0];
  CB_WireType.items.delete(0);
  Wire := TWire.create;
  Wire.name := 'Balco';
  Wire.Resistivity := 120;
  Wire.TCR := 0.25;
  CB_WireType.items.addobject(TheItems, Wire);
  {...add 2nd Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[1];
  CB_WireType.items.delete(1);
  Wire := TWire.create;
  Wire.name := 'Constantan (A Alloy)';
  Wire.Resistivity := 294;
  Wire.TCR := 0.00004;
  CB_WireType.items.addobject(TheItems, Wire);
  {...add 3rd Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[2];
  CB_WireType.items.delete(2);
  Wire := TWire.create;
  Wire.name := 'Copper';
  Wire.Resistivity := 10.371;
  Wire.TCR := 0.22;
  CB_WireType.items.addobject(TheItems, Wire);
  {...add 4th Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[3];
  CB_WireType.items.delete(3);
  Wire := TWire.create;
  Wire.name := 'Manganin';
  Wire.Resistivity := 290;
  Wire.TCR := 0.000015;
  CB_WireType.items.addobject(TheItems, Wire);
  {...add 5th Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[4];
  CB_WireType.items.delete(4);
  Wire := TWire.create;
  Wire.name := 'Modified Karma (K Alloy)';
  Wire.Resistivity := 800;
  Wire.TCR := 0.00002;
  CB_WireType.items.addobject(TheItems, Wire);
  {...add 6th Wire Type to Combobox}
  TheItems := CB_WireType.items.strings[5];
  CB_WireType.items.delete(5);
  Wire := TWire.create;
  Wire.name := 'Nickel, pure';
  Wire.Resistivity := 45;
  Wire.TCR := 0.33;
  CB_WireType.items.addobject(TheItems, Wire);
  CB_Wiretype.Itemindex := 0;
  RB_Length.checked := true;
  CB_WireTypeChange(Sender);
end;

(***********************************************************************)
{TWireTableForm.ReCalculate}
procedure TWireTableForm.ReCalculate;
const
  MINLENGTH_US = 0.01;
  MAXLENGTH_US = 100.0;
  MINRESIST    = 0.01;
  MAXRESIST    = 1000;
var
  ErrorMsg       : array[0..MAXERRORLENGTH] of char;
  ErrorUnit      : array[0..MAXERRORLENGTH] of char;
  ErrorAnd       : array[0..MAXERRORLENGTH] of char;
  ErrorCaption   : array[0..MAXERRORLENGTH] of char;
  StrUnit        : string;
  StrAnd         : string;
  StrMsg         : string;
  StrMin         : string;
  strMax         : string;
  EditStrings    : string;
  cs, txt        : Array[0..255] of char;
  ErrorCode      : Integer;
  MinLength,
  MaxLength     : RealType;
  Resistivity   : RealType;
  s              : String;
  ResistText         : string;
  Length         : RealType;
  Resistance     : RealType;
  Button: integer;
  GridRowIndex   : integer;
  valid          : Boolean;
begin
  {...Determining which min and max to use std. or si for error checking}
  if UnitsAreUS = True then begin
    {...Setting min and max to Standard units}
    MinLength := MINLENGTH_US;
    MaxLength := MAXLENGTH_US;
  end
  else begin
    MinLength := Inches_To_mm(MINLENGTH_US);
    MaxLength := Inches_To_mm(MAXLENGTH_US);
  end;
  {...solve for Length}
  if (RB_Length.checked = true) then begin
    EditStrings := EB_Input.text;
    StrVal(EditStrings, Resistance, ErrorCode);
    if ErrorCode <> 0 then begin
      IsThereAnError := True;
      LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ModalResult := 0;
      EB_Input.setfocus;
      EB_Input.clearselection;
      exit;
    end
    else if (Resistance < MINRESIST) or (Resistance > MAXRESIST) then begin
      IsThereAnError := True;
      LoadString(hinstance, ID_SZ_ohms, ErrorUnit, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_Resistance, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
      StrMsg := strpas(ErrorMsg);
      StrUnit := strpas(ErrorUnit);
      StrAnd := strpas(ErrorAnd);
      StrMin := floattostrf(MINRESIST, ffFixed, 8, 3);
      StrMax := floattostrf(MAXRESIST, ffFixed, 8, 3);
      EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
      StrPCopy(ErrorMsg, EditStrings);
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ModalResult := 0;
      EB_Input.setfocus;
      EB_Input.clearselection;
      exit;
    end;
    GridRowIndex := WireGrid.Row;
    ResistText := WireGrid.Cells[2, GridRowIndex];
    StrVal(ResistText, Resistivity, ErrorCode);
    if UnitsAreUS = true then begin
      Resistivity := Resistivity / 12;
    end
    else begin
      Resistivity := Resistivity / 1000;
    end;
    if (Resistivity > 0) then begin
      Length := Resistance/Resistivity;
      ST_Answer.caption := floattostrf(Length, ffFixed, 8, 1);
    end;
  end
  {...Solve for Resistance}
  else if (RB_Resistance.checked = true) then begin
    EditStrings := EB_Input.text;
    StrVal(EditStrings, Length, ErrorCode);
    if ErrorCode <> 0 then begin
      IsThereAnError := True;
      LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ModalResult := 0;
      EB_Input.setfocus;
      EB_Input.clearselection;
      exit;
    end
    else if (Length < MinLength) or (Length > MaxLength) then begin
      IsThereAnError := True;
      if UnitsAreUS = True then begin
        LoadString(hinstance, ID_SZ_inches, ErrorUnit, sizeof(ErrorMsg));
      end
      else begin
        LoadString(hinstance, ID_SZ_mm, ErrorUnit, sizeof(ErrorMsg));
      end;
      LoadString(hinstance, ID_SZ_Length, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
      StrMsg := strpas(ErrorMsg);
      StrUnit := strpas(ErrorUnit);
      StrAnd := strpas(ErrorAnd);
      StrMin := floattostrf(MinLength, ffFixed, 8, 3);
      StrMax := floattostrf(MaxLength, ffFixed, 8, 3);
      EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
      StrPCopy(ErrorMsg, EditStrings);
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ModalResult := 0;
      EB_Input.setfocus;
      EB_Input.clearselection;
      exit;
    end;
    GridRowIndex := WireGrid.Row;
    ResistText := WireGrid.Cells[2, GridRowIndex];
    StrVal(ResistText, Resistivity, ErrorCode);
    if UnitsAreUS = true then begin
      Resistivity := Resistivity / 12;
    end
    else begin
      Resistivity := Resistivity / 1000;
    end;
    if (Resistivity > 0) then begin
      Resistance := Length * Resistivity;
      ST_Answer.caption := floattostrf(Resistance, ffFixed, 8, 2);
    end;
  end;
end;


(***********************************************************************)
{TWireTableForm.BN_ComputeClick}
procedure TWireTableForm.BN_ComputeClick(Sender: TObject);
begin
  ReCalculate;
end;

(***********************************************************************)
{TWireTableForm.BN_OKClick}
procedure TWireTableForm.BN_OKClick(Sender: TObject);
begin
  close;
end;

(***********************************************************************)
{TWireTableForm.CB_WireTypeChange}
procedure TWireTableForm.CB_WireTypeChange(Sender: TObject);
var
 TheStr    : string;
 TheObject : TObject;
 TheWire   : Tobject;
 TheItems  : TStrings;
 WireID    : string;
 ResistNo  : Real{type};
 TCRNo     : Real{Type};
 converted : RealType;
 Resistance: RealType;
 TheResistance: RealType;
 WireGage  : string;
 Diameter  : string;
 i         : integer;
 j         : integer;
begin
  TheType := CB_WireType.itemindex;
  TheItems := CB_WireType.Items;
  TheObject := TheItems.objects[CB_WireType.itemindex];
  WireID := TheItems.strings[CB_WireType.ItemIndex];
  TheObject := TheItems.objects[CB_WireType.items.indexof(WireID)];
  {...placing Diameter in string grid}
  for i := 1 to 41 do begin
    if UnitsAreUS = true then begin
      diameter := Format('%3.4f',[table[i].d]) ;
    //  str(table[i].d:3:4, diameter);
      WireGrid.cells[0,i] := diameter;
    end
    else begin
      converted := Inches_To_mm(table[i].d);
      diameter := Format('%3.4f',[converted]) ;
//      str(converted:3:4, diameter);
      WireGrid.cells[0,i] := diameter;
    end;
  end;
  {...placing AWG in string grid}
  for i:= 1 to 41 do begin
    str(table[i].AWG:10:0, WireGage);
    WireGrid.cells[1,i] := WireGage;
  end;
  ResistNo := TWire(TheObject).Resistivity;
  {...placing Resistance in string grid}
  for i:= 1 to 41 do begin
    if UnitsAreUS = true then begin
      Resistance := ResistNo/table[i].cmils;
      thestr := Format('%10.4f',[Resistance]) ;
  //    str(Resistance:10:4, thestr);
      WireGrid.cells[2,i] := thestr;
    end
    else begin
      Resistance := ResistNo/table[i].cmils;
      TheResistance := Resistance / 0.3048;  {ohms/ft to ohms/m}
      thestr := Format('%10.4f',[TheResistance]) ;
   //   str(TheResistance:10:4, thestr);
      WireGrid.cells[2,i] := thestr;
    end;
  end;
  {...placing TCR in string grid}
  TCRNo := TWire(TheObject).TCR;
  if UnitsAreUS = true then begin
    thestr := Format('%10.2f',[TCRNo]) ;
  //  str(TCRNo:10:2, thestr);
  end
  else begin
    TCRNo := TCRNo * 9/5;
    thestr := Format('%10.2f',[TCRNo]) ;
  //  str(TCRNo:10:2, thestr);
  end;
  {for every awg}
  for i := 1 to 41 do begin
    {str(TCRNo:2:8, thestr);}
      WireGrid.cells[3,i] := thestr;
  end;
  ST_Answer.caption := '';
end;



procedure TWireTableForm.WireGridSelectCell(Sender: TObject; ACol,
  ARow: Integer; var CanSelect: Boolean);
begin
  ST_Answer.caption := '';
end;

procedure TWireTableForm.BN_CancelClick(Sender: TObject);
begin
  close;
end;

procedure TWireTableForm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(10300);
end;

end.
