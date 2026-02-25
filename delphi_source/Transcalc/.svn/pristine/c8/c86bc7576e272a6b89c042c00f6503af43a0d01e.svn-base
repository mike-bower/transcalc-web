unit Wire3pt;

interface
uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Grids, Buttons, acStream, acList, LogItem;

type
  RealType = double;

(***********************************************)
(* Span vs. Temperature 3 pt Wire Table Object *)
(***********************************************)
type
  TableEntry = record
  AWG   : RealType;
  d     : RealType;
  cmils : RealType;
end;

const
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

(***************************************************)
(*Span vs. Temperature 3 pt Wire Table Form Object *)
(***************************************************)
type
  TWireTable3ptForm = class(TForm)
    Panel1: TPanel;
    Image1: TImage;
    Panel2: TPanel;
    ST_Input: TLabel;
    Label1: TLabel;
    CB_WireType: TComboBox;
    Panel3: TPanel;
    EB_Input: TEdit;
    WireGrid: TStringGrid;
    TitleGrid: TStringGrid;
    Results: TGroupBox;
    ST_Answer: TLabel;
    ST_AnswerUnits: TLabel;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    BN_Help: TBitBtn;
    BN_Compute: TBitBtn;
    ST_InputUnits: TLabel;
    ST_Type: TLabel;
    procedure FormActivate(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure FormCreate(Sender: TObject);
    procedure RB_LengthClick(Sender: TObject);
    procedure RB_ResistanceClick(Sender: TObject);
    procedure CB_WireTypeChange(Sender: TObject);
    procedure BN_ComputeClick(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure WireGridSelectCell(Sender: TObject; Col, Row: Longint;
      var CanSelect: Boolean);
    procedure FormShow(Sender: TObject);
    procedure ReCalculate;
  private
    TheType             : integer;
    ExceptionRaised     : boolean;
    IsThereAnError      : boolean;
  end;

var
  WireTable3ptForm: TWireTable3ptForm;

implementation
uses MainMenu, convert, Span3pt;
{$R *.DFM}

(***********************************************)
(*  Wire Table Form Methods                    *)
(***********************************************)

(***********************************************************************)
{TWireTable3ptForm.FormShow}
procedure TWireTable3ptForm.FormShow(Sender: TObject);
begin
  if MainForm.UnitsAreUS = true then begin
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
{TWireTable3ptForm.FormCreate}
procedure TWireTable3ptForm.FormCreate(Sender: TObject);
var
  LengthUnit   : array[0..MAXTEXTLENGTH-1] of char;
  OhmsUnit     : array[0..MAXTEXTLENGTH-1] of char;
  TheItem      : string;
begin
  {..setting font so will resize in different resolutions}
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
  {...determining whether to place STd or SI values in the Form's units}
  if MainForm.UnitsAreUS = true then begin
    LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
    LoadString(hinstance, ID_SZ_Inches, LengthUnit, sizeof(LengthUnit));
  end
  else begin
    LoadString(hinstance, ID_SZ_Ohms, OhmsUnit, sizeof(OhmsUnit));
    LoadString(hinstance, ID_SZ_MM, LengthUnit, sizeof(LengthUnit));
  end;
  ST_InputUnits.caption := OhmsUnit;
  ST_AnswerUnits.caption := LengthUnit;
  EB_Input.text := Span3ptForm.ST_RMod.caption;
  ST_Answer.caption := '';
end;

(***********************************************************************)
{TWireTable3ptForm.FormClose}
procedure TWireTable3ptForm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(***********************************************************************)
{TWireTable3ptForm.FormActivate}
procedure TWireTable3ptForm.FormActivate(Sender: TObject);
begin
  ST_Type.caption := Span3ptForm.CB_WireType.text;
  CB_WireTypeChange(Sender);
  ReCalculate;
end;

(***********************************************************************)
{TWireTable3ptForm.ReCalculate}
procedure TWireTable3ptForm.ReCalculate;
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
  if MainForm.UnitsAreUS = True then begin
    {...Setting min and max to Standard units}
    MinLength := MINLENGTH_US;
    MaxLength := MAXLENGTH_US;
  end
  else begin
    MinLength := Inches_To_mm(MINLENGTH_US);
    MaxLength := Inches_To_mm(MAXLENGTH_US);
  end;
  {...solve for Length}
  EditStrings := EB_Input.text;
  val(EditStrings, Resistance, ErrorCode);
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
  val(ResistText, Resistivity, ErrorCode);
  if MainForm.UnitsAreUS = true then begin
    Resistivity := Resistivity / 12;
  end
  else begin
    Resistivity := Resistivity / 1000;
  end;
  if (Resistivity > 0) then begin
    Length := Resistance/Resistivity;
    ST_Answer.caption := floattostrf(Length, ffFixed, 8, 1);
  end;
end;

(***********************************************************************)
{TWireTable3ptForm.BN_ComputeClick}
procedure TWireTable3ptForm.BN_ComputeClick(Sender: TObject);
begin
  ReCalculate;
end;

(***********************************************************************)
{TWireTable3ptForm.BN_OKClick}
procedure TWireTable3ptForm.BN_OKClick(Sender: TObject);
begin
  MainForm.IsDirty := true;
  close;
end;

(***********************************************************************)
{TWireTable3ptForm.CB_WireTypeChange}
procedure TWireTable3ptForm.CB_WireTypeChange(Sender: TObject);
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
  TheType := Span3ptForm.CB_WireType.itemindex;
  TheItems := Span3ptForm.CB_WireType.Items;
  TheObject := TheItems.objects[Span3ptForm.CB_WireType.itemindex];
  WireID := TheItems.strings[Span3ptForm.CB_WireType.ItemIndex];
  TheObject := TheItems.objects[Span3ptForm.CB_WireType.items.indexof(WireID)];
  {...placing Diameter in string grid}
  for i := 1 to 41 do begin
    if MainForm.UnitsAreUS = true then begin
      str(table[i].d:3:4, diameter);
      WireGrid.cells[0,i] := diameter;
    end
    else begin
      converted := Inches_To_mm(table[i].d);
      str(converted:3:4, diameter);
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
    if MainForm.UnitsAreUS = true then begin
      Resistance := ResistNo/table[i].cmils;
      str(Resistance:10:4, thestr);
      WireGrid.cells[2,i] := thestr;
    end
    else begin
      Resistance := ResistNo/table[i].cmils;
      TheResistance := Resistance / 0.3048;  {ohms/ft to ohms/m}
      str(TheResistance:10:4, thestr);
      WireGrid.cells[2,i] := thestr;
    end;
  end;
  {...placing TCR in string grid}
  TCRNo := TWire(TheObject).TCR;
  if MainForm.UnitsAreUS = true then begin
    str(TCRNo:10:2, thestr);
  end
  else begin
    TCRNo := TCRNo * 9/5;
    str(TCRNo:10:2, thestr);
  end;
  {for every awg}
  for i := 1 to 41 do begin
    {str(TCRNo:2:8, thestr);}
      WireGrid.cells[3,i] := thestr;
  end;
  ST_Answer.caption := '';
end;

(***********************************************************************)
{TWireTable3ptForm.WireGridSelectCell}
procedure TWireTable3ptForm.WireGridSelectCell(Sender: TObject; Col,
  Row: Longint; var CanSelect: Boolean);
begin
  ST_Answer.caption := '';
end;

end.
