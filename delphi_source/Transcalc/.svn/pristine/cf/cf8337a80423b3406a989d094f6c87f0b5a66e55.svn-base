(* ********************************************* *)
(* Span Set Unit *)
(* ********************************************* *)
unit Spanset;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  Forms, Dialogs, ExtCtrls, StdCtrls, Buttons, acStream, acList, Log, LogStrm,
  LogItem, Printers, ioUtils, ShellAPI;

const
  MAXTEXTLENGTH = 40;
  MAXERRORLENGTH = 255;

type
  RealType = double;

  (* ********************************************* *)
  (* Span Set Object *)
  (* ********************************************* *)

  { - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - }
  { Wire Object Definition }
type
  TWire = class(Tobject)
    Name: string;
    Resistivity: real;
    TCR: real;
  end;

type
  TSpanSet = class(TLogItem)
  private
    FMeasuredSpan: shortstring;
    FBridgeResist: shortstring;
    FTotalRM: shortstring;
    FWireType: Int16;
    FResistorTCR: shortstring;
    FDesiredSpan: shortstring;
    FResistors: shortstring;
    FResistance: shortstring;
    TheString: shortstring;
  protected
    procedure AssignTo(Dest: TPersistent); override;
    procedure InitFields; override;
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
    procedure ShowTheForm; override;
    procedure PrintTheForm; override;
    function GetAsString: String; override;
  public
    constructor create;
    destructor destroy; override;
    property MeasuredSpan: shortstring read FMeasuredSpan write FMeasuredSpan;
    property BridgeResist: shortstring read FBridgeResist write FBridgeResist;
    property TotalRM: shortstring read FTotalRM write FTotalRM;
    property DesiredSpan: shortstring read FDesiredSpan write FDesiredSpan;
    property TheWireType: Int16 read FWireType write FWireType;
    property ResistorTCR: shortstring read FResistorTCR write FResistorTCR;
    property Resistors: shortstring read FResistors write FResistors;
    property Resistance: shortstring read FResistance write FResistance;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************* *)
  (* Span Set Forn Object *)
  (* ********************************************* *)
type
  TSpanSetForm = class(TForm)
    Panel1: TPanel;
    GroupBox1: TGroupBox;
    EB_MeasuredSpan: TEdit;
    Label1: TLabel;
    GroupBox2: TGroupBox;
    EB_BridgeResistance: TEdit;
    Label2: TLabel;
    GroupBox3: TGroupBox;
    EB_TotalRMResist: TEdit;
    Label3: TLabel;
    GroupBox4: TGroupBox;
    EB_DesiredSpan: TEdit;
    Label4: TLabel;
    Panel2: TPanel;
    GroupBox5: TGroupBox;
    D01Image: TImage;
    WireImage: TImage;
    RB_D01: TRadioButton;
    RB_Wire: TRadioButton;
    BN_Cut: TBitBtn;
    Panel4: TPanel;
    GroupBox6: TGroupBox;
    ST_Resistance: TLabel;
    Label7: TLabel;
    RB_BResistor: TRadioButton;
    ImageBPattern: TImage;
    GroupBox7: TGroupBox;
    CB_WireType: TComboBox;
    ST_ResistanceTCR: TLabel;
    Image1: TImage;
    BN_Compute: TBitBtn;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    BN_Help: TBitBtn;
    BN_Print: TBitBtn;
    Label5: TLabel;
    SaveDialogPrint: TSaveDialog;
    // Sheet1: TSheet;
    procedure RB_D01Click(Sender: Tobject);
    procedure RB_WireClick(Sender: Tobject);
    procedure BN_CutClick(Sender: Tobject);
    procedure FormCreate(Sender: Tobject);
    procedure BN_ComputeClick(Sender: Tobject);
    procedure FormActivate(Sender: Tobject);
    procedure BN_CancelClick(Sender: Tobject);
    procedure BN_OKClick(Sender: Tobject);
    function CalculateResistance: RealType;
    procedure FormClose(Sender: Tobject; var Action: TCloseAction);
    procedure RB_BResistorClick(Sender: Tobject);
    procedure CB_WireTypeChange(Sender: Tobject);
    procedure BN_PrintClick(Sender: Tobject);
    procedure BN_HelpClick(Sender: Tobject);
  private
    OldMeasuredSpan: string;
    OldBridgeResist: string;
    OldTotalRM: string;
    OldDesiredSpan: string;
    Old_Resistance: string;
    Resistor: string;
    ExceptionRaised: boolean;
    IsThereAnError: boolean;
    TheMeasuredSpan: RealType;
    TheBridgeResist: RealType;
    TheTotalRM: RealType;
    TheDesiredSpan: RealType;
    ResistValue: RealType;
    TheType: integer;
  public
    SpanSetObject: TSpanSet;
    Wire: TWire;
  end;

var
  SpanSetForm: TSpanSetForm;

implementation

uses MainMenu, Convert, SetD01, SpanWire, BPattern, Compenst;
{$R *.DFM}

(* ********************************************* *)
(* Span Set Object Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TSpanSet.create }
constructor TSpanSet.create;
begin
  { ...create object }
  inherited create;
  { ...associate the string with the object }
  TheString := 'Span Set';
end;

(* ********************************************************************* *)
{ TSpanSet.destroy }
destructor TSpanSet.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TSpanSet.GetAsString }
function TSpanSet.GetAsString: String;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TSpanSet.ShowTheForm }
procedure TSpanSet.ShowTheForm;
begin
  Application.CreateForm(TSpanSetForm, SpanSetForm);
  SpanSetForm.showmodal;
end;

(* ********************************************************************* *)
{ TSpanSet.PrintTheForm }
procedure TSpanSet.PrintTheForm;
var
  Sender: Tobject;
begin
  Sender := self;
  Application.CreateForm(TSpanSetForm, SpanSetForm);
  SpanSetForm.visible := false;
  SpanSetForm.FormActivate(Sender);
  SpanSetForm.BN_PrintClick(Sender);
  SpanSetForm.BN_CancelClick(Sender);
end;

(* ********************************************************************* *)
{ TSpanSet.AssignTo }
procedure TSpanSet.AssignTo(Dest: TPersistent);
begin
  if (Dest is TSpanSet) and (self is Dest.ClassType) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TSpanSet do
    begin
      FMeasuredSpan := self.FMeasuredSpan;
      FBridgeResist := self.FBridgeResist;
      FTotalRM := self.FTotalRM;
      FWireType := self.FWireType;
      FResistorTCR := self.FResistorTCR;
      FDesiredSpan := self.FDesiredSpan;
      FResistance := self.FResistance;
      TheString := self.TheString;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TSpanSet.InitFields }
procedure TSpanSet.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TSpanSet.SaveToStream }
procedure TSpanSet.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FMeasuredSpan, sizeof(shortstring));
  Stream.SaveBuffer(FBridgeResist, sizeof(shortstring));
  Stream.SaveBuffer(FTotalRM, sizeof(shortstring));
  Stream.SaveBuffer(FDesiredSpan, sizeof(shortstring));
  Stream.SaveBuffer(FWireType, sizeof(Int16));
  Stream.SaveBuffer(FResistorTCR, sizeof(shortstring));
  Stream.SaveBuffer(FResistance, sizeof(shortstring));
  Stream.SaveBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************************************* *)
{ TSpanSet.ReadFromStream }
procedure TSpanSet.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FMeasuredSpan, sizeof(shortstring));
  Stream.ReadBuffer(FBridgeResist, sizeof(shortstring));
  Stream.ReadBuffer(FTotalRM, sizeof(shortstring));
  Stream.ReadBuffer(FDesiredSpan, sizeof(shortstring));
  Stream.ReadBuffer(FWireType, sizeof(Int16));
  Stream.ReadBuffer(FResistorTCR, sizeof(shortstring));
  Stream.ReadBuffer(FResistance, sizeof(shortstring));
  Stream.ReadBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************* *)
(* Span Set Form Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TSpanSetForm.CalculateResistance }
function TSpanSetForm.CalculateResistance: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  ResistanceValue: RealType;
  Button: integer;
begin
  Result := 0.0;
  ExceptionRaised := false;
  if TheDesiredSpan <> 0 then
  begin
    try
      ResistanceValue := ((TheMeasuredSpan * (TheBridgeResist + TheTotalRM)) /
        TheDesiredSpan)
        - (TheBridgeResist + TheTotalRM);
    except
      on EMathError do
      begin
        LoadString(hinstance, ID_SZ_CompImpraticable, ErrorMsg,
          sizeof(ErrorMsg));
        LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption,
          sizeof(ErrorCaption));
        Button := Application.MessageBox(ErrorMsg, ErrorCaption,
          mb_OK or mb_IconExclamation);
        ExceptionRaised := true;
        exit;
      end;
    end;
    CalculateResistance := ResistanceValue;
  end
  else
  begin
    LoadString(hinstance, ID_SZ_DesiredNoZero, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    EB_MeasuredSpan.setfocus;
    EB_MeasuredSpan.clearselection;
    ExceptionRaised := true;
    exit;
  end;
end;

(* ********************************************************************* *)
{ TSpanSetForm.RB_D01Click }
procedure TSpanSetForm.RB_D01Click(Sender: Tobject);
begin
  { ...RB_D01 is checked and image is set to display a drawing of E01 Resistor }
  RB_D01.checked := true;
  D01Image.visible := true;
  WireImage.visible := false;
  ImageBPattern.visible := false;
end;

(* ********************************************************************* *)
{ TSpanSetForm.RB_BResistorClick }
procedure TSpanSetForm.RB_BResistorClick(Sender: Tobject);
begin
  RB_BResistor.checked := true;
  ImageBPattern.visible := true;
  D01Image.visible := false;
  WireImage.visible := false;
end;

(* ********************************************************************* *)
{ TSpanSetForm.RB_WireClick }
procedure TSpanSetForm.RB_WireClick(Sender: Tobject);
begin
  { ...RB_Wire is checked and image is set to display a spool of wire }
  RB_Wire.checked := true;
  D01Image.visible := false;
  WireImage.visible := true;
  ImageBPattern.visible := false;
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_CutClick }
procedure TSpanSetForm.BN_CutClick(Sender: Tobject);
begin
  { ...When cut button pressed shows the appropiate form }
  if RB_D01.checked = true then
  begin
    Application.CreateForm(TSpanSetD01ResistorForm, SpanSetD01ResistorForm);
    SpanSetD01ResistorForm.showmodal;
  end
  else if RB_Wire.checked = true then
  begin
    Application.CreateForm(TWireTableSpanForm, WireTableSpanForm);
    WireTableSpanForm.showmodal;
  end
  else if RB_BResistor.checked = true then
  begin
    Application.CreateForm(TBPatternForm, BPatternForm);
    BPatternForm.showmodal;
  end;
end;

(* ********************************************************************* *)
{ TSpanSetForm.FormCreate }
procedure TSpanSetForm.FormCreate(Sender: Tobject);
begin
  { initializing radio button and images }
  RB_BResistor.checked := true;
  ImageBPattern.visible := true;
  D01Image.visible := false;
  WireImage.visible := false;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_ComputeClick }
procedure TSpanSetForm.BN_ComputeClick(Sender: Tobject);
const
  MINSPAN = 0.0001;
  MAXSPAN = 10;
  MINBRIDGE = 50;
  MAXBRIDGE = 10000;
  MINTOTALRM = 0;
  MAXTOTALRM = 1000;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorUnit: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorAnd: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  StrUnit: string;
  StrAnd: string;
  StrMsg: string;
  StrMin: string;
  StrMax: string;
  EditStrings: string;
  ErrorCode: integer;
  Button: integer;
begin
  ST_Resistance.caption := '';
  IsThereAnError := false;
  { ..checking to see if Measured Span is valid }
  EditStrings := EB_MeasuredSpan.text;
  StrVal(EditStrings, TheMeasuredSpan, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_MeasuredSpan.setfocus;
    EB_MeasuredSpan.clearselection;
    exit;
  end
  else if (TheMeasuredSpan < MINSPAN) or (TheMeasuredSpan > MAXSPAN) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_MV, ErrorUnit, sizeof(ErrorUnit));
    LoadString(hinstance, ID_SZ_MeasuredSpan, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINSPAN, ffFixed, 8, 3);
    StrMax := floattostrf(MAXSPAN, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_MeasuredSpan.setfocus;
    EB_MeasuredSpan.clearselection;
    exit;
  end;
  { ..checking to see if Bridge Resistance is valid }
  EditStrings := EB_BridgeResistance.text;
  StrVal(EditStrings, TheBridgeResist, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_BridgeResistance.setfocus;
    EB_BridgeResistance.clearselection;
    exit;
  end
  else if (TheBridgeResist < MINBRIDGE) or (TheBridgeResist > MAXBRIDGE) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_Ohms, ErrorUnit, sizeof(ErrorUnit));
    LoadString(hinstance, ID_SZ_BridgeResist, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINBRIDGE, ffFixed, 8, 3);
    StrMax := floattostrf(MAXBRIDGE, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_BridgeResistance.setfocus;
    EB_BridgeResistance.clearselection;
    exit;
  end;
  { ..checking to see if Total RM Resistance is valid }
  EditStrings := EB_TotalRMResist.text;
  StrVal(EditStrings, TheTotalRM, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_TotalRMResist.setfocus;
    EB_TotalRMResist.clearselection;
    exit;
  end
  else if (TheTotalRM < MINTOTALRM) or (TheTotalRM > MAXTOTALRM) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_Ohms, ErrorUnit, sizeof(ErrorUnit));
    LoadString(hinstance, ID_SZ_TotalRM, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINTOTALRM, ffFixed, 8, 3);
    StrMax := floattostrf(MAXTOTALRM, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_TotalRMResist.setfocus;
    EB_TotalRMResist.clearselection;
    exit;
  end;
  { ..checking to see if Desired Span is valid }
  EditStrings := EB_DesiredSpan.text;
  StrVal(EditStrings, TheDesiredSpan, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DesiredSpan.setfocus;
    EB_DesiredSpan.clearselection;
    exit;
  end
  else if (TheDesiredSpan < MINSPAN) or (TheDesiredSpan > MAXSPAN) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_MV, ErrorUnit, sizeof(ErrorUnit));
    LoadString(hinstance, ID_SZ_DesiredSpan, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorAnd));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MINSPAN, ffFixed, 8, 3);
    StrMax := floattostrf(MAXSPAN, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DesiredSpan.setfocus;
    EB_DesiredSpan.clearselection;
    exit;
  end;
  { ...calculating Resistance value }
  if (TheMeasuredSpan < TheDesiredSpan) then
  begin
    { ..display message telling user the low temp must be lower than high temp }
    LoadString(hinstance, ID_SZ_DesiredGreater, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    EB_DesiredSpan.setfocus;
    EB_DesiredSpan.clearselection;
    ExceptionRaised := true;
    exit;
  end
  else
  begin
    ResistValue := CalculateResistance;
    if ExceptionRaised = false then
    begin
      ST_Resistance.caption := floattostrf(abs(ResistValue), ffFixed, 6, 2);
    end;
  end;
end;

(* ********************************************************************* *)
{ TSpanSetForm.FormActivate }
procedure TSpanSetForm.FormActivate(Sender: Tobject);
var
  EditStrings: string;
  i: integer;
  TheItem: TacStreamable;
  TheItems: string;
begin
  { ...getting the object if there is one }
  TheItem := nil;
  i := 0;
  { ...add 1st Wire Type to Combobox }
  TheItems := CB_WireType.items.strings[0];
  CB_WireType.items.delete(0);
  Wire := TWire.create;
  Wire.Name := 'Constantan (A Alloy)';
  Wire.Resistivity := 294;
  Wire.TCR := 0.00004;
  CB_WireType.items.addobject(TheItems, Wire);
  { ...add 2nd Wire Type to Combobox }
  TheItems := CB_WireType.items.strings[1];
  CB_WireType.items.delete(1);
  Wire := TWire.create;
  Wire.Name := 'Manganin';
  Wire.Resistivity := 290;
  Wire.TCR := 0.000015;
  CB_WireType.items.addobject(TheItems, Wire);
  { ...add 3rd Wire Type to Combobox }
  TheItems := CB_WireType.items.strings[2];
  CB_WireType.items.delete(2);
  Wire := TWire.create;
  Wire.Name := 'Modified Karma (K Alloy)';
  Wire.Resistivity := 800;
  Wire.TCR := 0.00002;
  CB_WireType.items.addobject(TheItems, Wire);
  Repeat
    If MainForm.Flog.AtIndex(i) is TSpanSet then
    begin
      TheItem := MainForm.Flog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.Flog.Count);
  { ...If there is object, placing values in edit boxes }
  if TheItem <> nil then
  begin
    EB_MeasuredSpan.text := (TheItem as TSpanSet).MeasuredSpan;
    EB_BridgeResistance.text := (TheItem as TSpanSet).BridgeResist;
    EB_TotalRMResist.text := (TheItem as TSpanSet).TotalRM;
    EB_DesiredSpan.text := (TheItem as TSpanSet).DesiredSpan;
    CB_WireType.ItemIndex := (TheItem as TSpanSet).TheWireType;
    if (CB_WireType.ItemIndex = 0) then
    begin
      RB_BResistor.enabled := true;
      RB_D01.enabled := true;
      RB_Wire.enabled := true;
      RB_BResistor.checked := true;
    end
    else if CB_WireType.ItemIndex = 1 then
    begin
      RB_BResistor.enabled := false;
      RB_D01.enabled := false;
      RB_Wire.enabled := true;
      RB_Wire.checked := true;
    end
    else if CB_WireType.ItemIndex = 2 then
    begin
      RB_BResistor.enabled := false;
      RB_D01.enabled := true;
      RB_Wire.enabled := true;
      RB_D01.checked := true;
    end;
    ST_ResistanceTCR.caption := (TheItem as TSpanSet).ResistorTCR;
    ST_Resistance.caption := (TheItem as TSpanSet).Resistance;
  end
  else
  begin
    CB_WireType.ItemIndex := 0;
    CB_WireTypeChange(Sender);
  end;
  { ...placing initial values in old variables in case cancel clicked }
  OldMeasuredSpan := EB_MeasuredSpan.text;
  OldBridgeResist := EB_BridgeResistance.text;
  OldTotalRM := EB_TotalRMResist.text;
  OldDesiredSpan := EB_DesiredSpan.text;
  Old_Resistance := ST_Resistance.caption;
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_CancelClick }
procedure TSpanSetForm.BN_CancelClick(Sender: Tobject);
begin
  { ...placing initialvalues in edit box }
  EB_MeasuredSpan.text := OldMeasuredSpan;
  EB_BridgeResistance.text := OldBridgeResist;
  EB_TotalRMResist.text := OldTotalRM;
  EB_DesiredSpan.text := OldDesiredSpan;
  ST_Resistance.caption := Old_Resistance;
  close;
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_OKClick }
procedure TSpanSetForm.BN_OKClick(Sender: Tobject);
var
  TheItem: TacStreamable;
  i: integer;
  j: integer;
begin
  BN_ComputeClick(Sender);
  if IsThereAnError = true then
  begin
    exit;
  end;
  { ...getting the object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    If MainForm.Flog.AtIndex(i) is TSpanSet then
    begin
      TheItem := MainForm.Flog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.Flog.Count);
  { ...If there is object, placing values in edit boxes }
  if TheItem = nil then
  begin
    { ...placing values in object }
    SpanSetObject := TSpanSet.create;
    SpanSetObject.MeasuredSpan := EB_MeasuredSpan.text;
    SpanSetObject.BridgeResist := EB_BridgeResistance.text;
    SpanSetObject.TotalRM := EB_TotalRMResist.text;
    SpanSetObject.DesiredSpan := EB_DesiredSpan.text;
    SpanSetObject.TheWireType := CB_WireType.ItemIndex;
    SpanSetObject.ResistorTCR := ST_ResistanceTCR.caption;
    SpanSetObject.Resistance := ST_Resistance.caption;
    MainForm.AddToLog(SpanSetObject);
    j := 0;
    { ...placing object string in outline }
    Repeat
      inc(j);
    until (MainForm.XCalcOutline.items[j].text = 'Circuit Refinements') or
      (j > MainForm.XCalcOutline.ItemCount);
    MainForm.XCalcOutline.AddChild(j, SpanSetObject.GetAsString);
  end
  else
  begin
    (TheItem as TSpanSet).MeasuredSpan := EB_MeasuredSpan.text;
    (TheItem as TSpanSet).BridgeResist := EB_BridgeResistance.text;
    (TheItem as TSpanSet).TheWireType := CB_WireType.ItemIndex;
    (TheItem as TSpanSet).ResistorTCR := ST_ResistanceTCR.caption;
    (TheItem as TSpanSet).TotalRM := EB_TotalRMResist.text;
    (TheItem as TSpanSet).DesiredSpan := EB_DesiredSpan.text;
    (TheItem as TSpanSet).Resistance := ST_Resistance.caption;
  end;
  MainForm.IsDirty := true;
  close;
  if MainForm.CompDlgShowing = true then
  begin
    CompensationDlg.close;
  end;
end;

(* ********************************************************************* *)
{ TSpanSetForm.FormClose }
procedure TSpanSetForm.FormClose(Sender: Tobject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TSpanSetForm.CB_WireTypeChange }
procedure TSpanSetForm.CB_WireTypeChange(Sender: Tobject);
var
  TheStr: string;
  TheObject: Tobject;
  TheWire: Tobject;
  TheItems: TStrings;
  WireID: string;
  ResistNo: real { type };
  TCRNo: real { Type };
  converted: RealType;
  Resistance: RealType;
  WireGage: string;
  Diameter: string;
  i: integer;
  j: integer;
begin
  if CB_WireType.text = 'Manganin' then
  begin
    RB_BResistor.enabled := false;
    RB_D01.enabled := false;
    RB_Wire.enabled := true;
    RB_Wire.checked := true;
  end
  else if CB_WireType.text = 'Modified Karma (K Alloy)' then
  begin
    RB_BResistor.enabled := false;
    RB_D01.enabled := true;
    RB_Wire.enabled := true;
    RB_D01.checked := true;
  end
  else if CB_WireType.text = 'Constantan (A Alloy)' then
  begin
    RB_BResistor.enabled := true;
    RB_D01.enabled := true;
    RB_Wire.enabled := true;
    RB_BResistor.checked := true;
  end;
  TheType := CB_WireType.ItemIndex;
  TheItems := CB_WireType.items;
  TheObject := TheItems.objects[CB_WireType.ItemIndex];
  WireID := TheItems.strings[CB_WireType.ItemIndex];
  TheObject := TheItems.objects[CB_WireType.items.indexof(WireID)];
  { ...placing TCR in string grid }
  TCRNo := TWire(TheObject).TCR;
  if MainForm.UnitsAreUS = true then
  begin
    // str(TCRNo:8:2, thestr);
    TheStr := format('%8.2f', [TCRNo]);
  end
  else
  begin
    TCRNo := TCRNo * 9 / 5;
    // str(TCRNo:8:2, thestr);
    TheStr := format('%8.2f', [TCRNo]);
  end;
  ST_ResistanceTCR.caption := TheStr;
  ST_Resistance.caption := '';
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_PrintClick }
procedure TSpanSetForm.BN_PrintClick(Sender: Tobject);
var
  GridSelection: array [0 .. MAXTEXTLENGTH - 1] of char;
  HeaderPChar: array [0 .. MAXTEXTLENGTH - 1] of char;
  HeaderString: string;
  DateString: string;
  id: longint;
  MetaHandle: Thandle;
  sserror: integer;
  htmlText: string;
  Stream: tResourceStream;
  strstream: tStringStream;

begin
  Stream := tResourceStream.create(hinstance, 'SpanSet', RT_RCDATA);
  strstream := tStringStream.create();

  try
    strstream.LoadFromStream(Stream);
    htmlText := strstream.DataString;
  finally
    strstream.Free();
    Stream.Free();
  end;

  htmlText := StringReplace(htmlText, '$ms1', EB_MeasuredSpan.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$br1', EB_BridgeResistance.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$rr1', EB_TotalRMResist.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$ds1', EB_DesiredSpan.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$rs1', ST_Resistance.caption,
    [rfReplaceAll, rfIgnoreCase]);
  SaveDialogPrint.FileName := '';
  SaveDialogPrint.InitialDir := tPath.GetDocumentsPath;
  if SaveDialogPrint.Execute
  then
  begin
    tfile.writeAllText(SaveDialogPrint.FileName, htmlText);
    ShellExecute(Handle, 'open', PChar(SaveDialogPrint.FileName), nil, nil,
      SW_SHOWNORMAL);
  end;
  (* id := 0;
    {...clearing sheet for new values}
    SSClearRange(Sheet1.SS, 4, 4, 11, 4, 3);
    {...placing values on Sheet}
    SSSetActiveCell(Sheet1.SS, 4, 4);
    Sheet1.text := EB_MeasuredSpan.text;
    SSSetActiveCell(Sheet1.SS, 5, 4);
    Sheet1.text := EB_BridgeResistance.text;
    SSSetActiveCell(Sheet1.SS, 6, 4);
    Sheet1.text := EB_TotalRMResist.text;
    SSSetActiveCell(Sheet1.SS, 7, 4);
    Sheet1.text := EB_DesiredSpan.text;
    SSSetActiveCell(Sheet1.SS, 11, 4);
    Sheet1.text := ST_Resistance.caption;
    sserror := SSObjNewPicture(Sheet1.ss, 1, 13, 6, 20, id, Image1.Picture.Metafile.handle, 8, 0, 0);
    SSSetPrintFooter(Sheet1.SS, '&04&LTransCalc™' + #13#10 + 'Measurements Group, Inc.');
    DateString := FormatDateTime('mmmm dd, yyyy' , Date);
    HeaderString := '&04&L' + MainForm.SaveFileName +  + '&R' + DateString;
    strpcopy(HeaderPChar, HeaderString);
    SSSetPrintHeader(Sheet1.SS, HeaderPChar);
    SSSetPrintArea(Sheet1.ss, '$A$1:$G$30');
    SSFilePrint(Sheet1.ss, 0); *)
end;

(* ********************************************************************* *)
{ TSpanSetForm.BN_HelpClick }
procedure TSpanSetForm.BN_HelpClick(Sender: Tobject);
begin
  Application.HelpContext(2060);
end;

begin
  { ...registering object }
  RegisterClasses([TSpanSet]);

end.
