(* ********************************************* *)
(* Reverse Bending Beam Unit *)
(* ********************************************* *)
unit Revbb;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  Forms, Dialogs, StdCtrls, ExtCtrls, Buttons, acStream, acList, Log, LogItem,
  LogStrm, Printers, ioUtils, ShellAPI;

const
  MAXTEXTLENGTH = 40;
  MAXERRORLENGTH = 255;

type
  RealType = double;

  (* ********************************************* *)
  (* TReverseBendingBeam Object *)
  (* ********************************************* *)
type
  TReverseBendingBeam = class(TLogItem)
  private
    FAppliedLoad: shortstring;
    FBeamWidth: shortstring;
    FThickness: shortstring;
    FDistanceGage: shortstring;
    FModulus: shortstring;
    FGageLength: shortstring;
    FGageFactor: shortstring;
    FAvgStrain: shortstring;
    FGradient: shortstring;
    FFullSpan: shortstring;
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
    property AppliedLoad: shortstring read FAppliedLoad write FAppliedLoad;
    property BeamWidth: shortstring read FBeamWidth write FBeamWidth;
    property Thickness: shortstring read FThickness write FThickness;
    property DistanceGage: shortstring read FDistanceGage write FDistanceGage;
    property Modulus: shortstring read FModulus write FModulus;
    property GageLength: shortstring read FGageLength write FGageLength;
    property GageFactor: shortstring read FGageFactor write FGageFactor;
    property AvgStrain: shortstring read FAvgStrain write FAvgStrain;
    property Gradient: shortstring read FGradient write FGradient;
    property FullSpan: shortstring read FFullSpan write FFullSpan;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************* *)
  (* TReverseBBFrm Form Object *)
  (* ********************************************* *)
type
  TReverseBBFrm = class(TForm)
    Panel1: TPanel;
    GroupBox1: TGroupBox;
    EB_AppliedLoad: TEdit;
    GroupBox2: TGroupBox;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    GroupBox4: TGroupBox;
    EB_BeamWidth: TEdit;
    EB_Thickness: TEdit;
    EB_DistancebtGage: TEdit;
    EB_GageLength: TEdit;
    ST_AppliedLoadUnit: TLabel;
    ST_BeamWidthUnit: TLabel;
    ST_ThicknessUnit: TLabel;
    ST_DistancebtGageUnit: TLabel;
    ST_GageLengthUnit: TLabel;
    Panel2: TPanel;
    GroupBox5: TGroupBox;
    Label6: TLabel;
    Label7: TLabel;
    ST_Average: TLabel;
    ST_Gradient: TLabel;
    Label10: TLabel;
    Label11: TLabel;
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    Label19: TLabel;
    Label20: TLabel;
    Label21: TLabel;
    ST_FullSpan: TLabel;
    Label23: TLabel;
    EB_GageFactor: TEdit;
    BN_Compute: TBitBtn;
    BN_Help: TBitBtn;
    ST_KGF: TLabel;
    ST_KGFUnit: TLabel;
    BN_Print: TBitBtn;
    EB_Modulus: TEdit;
    ST_ModulusUnits: TLabel;
    Image1: TImage;
    SaveDialogPrint: TSaveDialog;
    // Sheet1: TSheet;
    procedure FormCreate(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    procedure BN_ComputeClick(Sender: TObject);
    function Min_Strain: RealType;
    function Max_Strain: RealType;
    function Avg_Strain: RealType;
    function CalculateGradient: RealType;
    function FullBridgeSensitivity: RealType;
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure EB_AppliedLoadExit(Sender: TObject);
    procedure BN_PrintClick(Sender: TObject);
    procedure BN_HelpClick(Sender: TObject);
    procedure Image1Click(Sender: TObject);
  private
    { Private declarations }
    Old_AppliedLoad: string;
    Old_BeamWidth: string;
    Old_Thickness: string;
    Old_DistanceGage: string;
    Old_Modulus: string;
    Old_GageLength: string;
    Old_GageFactor: string;
    Old_AvgStrain: string;
    Old_Gradient: string;
    Old_FullSpan: string;
    AvgStrainText: string;
    GradientText: string;
    SensitiveText: string;
    IsThereAnError: boolean;
    ExceptionRaised: boolean;
    Load: RealType;
    width: RealType;
    thick: RealType;
    Distance: RealType;
    elasticity: RealType;
    length: RealType;
    Factor: RealType;
    EMax: RealType;
    EMin: RealType;
    EAvg: RealType;
    TheGradient: RealType;
    FullSensitivity: RealType;
  public
    { Public declarations }
    ReverseBBeamObject: TReverseBendingBeam;
    RevBBChosen: boolean;
  end;

var
  ReverseBBFrm: TReverseBBFrm;

implementation

uses MainMenu, Convert, Design;
{$R *.DFM}

(* ********************************************* *)
(* BinocularBeam Object Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TReverseBendingBeam.create }
constructor TReverseBendingBeam.create;
begin
  { ...creating object }
  inherited create;
  { ...associating string with object }
  TheString := 'Bending - Reverse Bending';
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.destroy }
destructor TReverseBendingBeam.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.GetAsString }
function TReverseBendingBeam.GetAsString: string;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.ShowTheForm }
procedure TReverseBendingBeam.ShowTheForm;
begin
  Application.CreateForm(TReverseBBFrm, ReverseBBFrm);
  ReverseBBFrm.showmodal;
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.PrintTheForm }
procedure TReverseBendingBeam.PrintTheForm;
var
  Sender: TObject;

begin
  Sender := self;
  Application.CreateForm(TReverseBBFrm, ReverseBBFrm);
  ReverseBBFrm.visible := false;
  ReverseBBFrm.FormActivate(Sender);
  ReverseBBFrm.BN_PrintClick(Sender);
  ReverseBBFrm.BN_CancelClick(Sender);
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.AssignTo }
procedure TReverseBendingBeam.AssignTo(Dest: TPersistent);
begin
  if (Dest is TReverseBendingBeam) and (self is Dest.ClassType) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TReverseBendingBeam do
    begin
      FAppliedLoad := self.FAppliedLoad;
      FBeamWidth := self.FBeamWidth;
      FThickness := self.FThickness;
      FDistanceGage := self.FDistanceGage;
      FModulus := self.FModulus;
      FGageLength := self.FGageLength;
      FGageFactor := self.FGageFactor;
      FAvgStrain := self.FAvgStrain;
      FGradient := self.FGradient;
      FFullSpan := self.FFullSpan;
      TheString := self.TheString;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.InitFields }
procedure TReverseBendingBeam.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.SaveToStream }
procedure TReverseBendingBeam.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FAppliedLoad, sizeof(shortstring));
  Stream.SaveBuffer(FBeamWidth, sizeof(shortstring));
  Stream.SaveBuffer(FThickness, sizeof(shortstring));
  Stream.SaveBuffer(FDistanceGage, sizeof(shortstring));
  Stream.SaveBuffer(FModulus, sizeof(shortstring));
  Stream.SaveBuffer(FGageLength, sizeof(shortstring));
  Stream.SaveBuffer(FGageFactor, sizeof(shortstring));
  Stream.SaveBuffer(FAvgStrain, sizeof(shortstring));
  Stream.SaveBuffer(FGradient, sizeof(shortstring));
  Stream.SaveBuffer(FFullSpan, sizeof(shortstring));
  Stream.SaveBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************************************* *)
{ TReverseBendingBeam.ReadFromStream }
procedure TReverseBendingBeam.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FAppliedLoad, sizeof(shortstring));
  Stream.ReadBuffer(FBeamWidth, sizeof(shortstring));
  Stream.ReadBuffer(FThickness, sizeof(shortstring));
  Stream.ReadBuffer(FDistanceGage, sizeof(shortstring));
  Stream.ReadBuffer(FModulus, sizeof(shortstring));
  Stream.ReadBuffer(FGageLength, sizeof(shortstring));
  Stream.ReadBuffer(FGageFactor, sizeof(shortstring));
  Stream.ReadBuffer(FAvgStrain, sizeof(shortstring));
  Stream.ReadBuffer(FGradient, sizeof(shortstring));
  Stream.ReadBuffer(FFullSpan, sizeof(shortstring));
  Stream.ReadBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************* *)
(* BinocularBeam Object Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TReverseBBFrm.Min_Strain }
function TReverseBBFrm.Min_Strain: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  StrainResult: RealType;
  Button: integer;
begin
  StrainResult := 0;
  ExceptionRaised := false;
  Numerator := 6 * Load * ((Distance / 2) - (0.5 * length));
  Denominator := elasticity * width * sqr(thick);
  try
    StrainResult := (Numerator / Denominator) * 1E6;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoMinStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  Min_Strain := StrainResult;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.Max_Strain }
function TReverseBBFrm.Max_Strain: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  StrainResult: RealType;
  Button: integer;
begin
  StrainResult := 0;
  ExceptionRaised := false;
  Numerator := 6 * Load * ((Distance / 2) + (0.5 * length));
  Denominator := elasticity * width * sqr(thick);
  try
    StrainResult := (Numerator / Denominator) * 1E6;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoMaxStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  Max_Strain := StrainResult;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.Avg_Strain }
function TReverseBBFrm.Avg_Strain: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  StrainResult: RealType;
  Button: integer;
begin
  StrainResult := 0;
  ExceptionRaised := false;
  Numerator := 6 * Load * (Distance / 2);
  Denominator := elasticity * width * sqr(thick);
  try
    StrainResult := (Numerator / Denominator) * 1E6;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoAvgStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  Avg_Strain := StrainResult;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.CalculateGradient }
function TReverseBBFrm.CalculateGradient: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  GradientResult: RealType;
  Button: integer;
begin
  GradientResult := 0;
  ExceptionRaised := false;
  Numerator := EMax - EMin;
  Denominator := EMax;
  try
    GradientResult := (Numerator / Denominator);
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoGradient, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  CalculateGradient := GradientResult * 100;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.FullBridgeSensitivity }
function TReverseBBFrm.FullBridgeSensitivity: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Answer: RealType;
  SpanResult: RealType;
  Button: integer;
begin
  SpanResult := 0;
  ExceptionRaised := false;
  try
    SpanResult := EAvg * Factor * 1E-3;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoFullSpan, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  FullBridgeSensitivity := SpanResult;
end;

procedure TReverseBBFrm.Image1Click(Sender: TObject);
begin

end;

(* ********************************************************************* *)
{ TReverseBBFrm.FormCreate }
procedure TReverseBBFrm.FormCreate(Sender: TObject);
var
  LoadUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
  DimensionUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
  ModulusUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
begin
  { ...deciding whether to put SI or Std. unitson form }
  if MainForm.UnitsAreUS = true then
  begin
    LoadString(hinstance, ID_SZ_USLBF, LoadUnit, sizeof(LoadUnit));
    LoadString(hinstance, ID_SZ_Inches, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_PSI, ModulusUnit, sizeof(ModulusUnit));
  end
  else
  begin
    LoadString(hinstance, ID_SZ_N, LoadUnit, sizeof(LoadUnit));
    LoadString(hinstance, ID_SZ_MM, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_GPa, ModulusUnit, sizeof(ModulusUnit));
  end;
  { ...placing units on the form }
  ST_AppliedLoadUnit.caption := LoadUnit;
  ST_BeamWidthUnit.caption := DimensionUnit;
  ST_ThicknessUnit.caption := DimensionUnit;
  ST_DistancebtGageUnit.caption := DimensionUnit;
  ST_ModulusUnits.caption := ModulusUnit;
  ST_GageLengthUnit.caption := DimensionUnit;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.BN_CancelClick }
procedure TReverseBBFrm.BN_CancelClick(Sender: TObject);
begin
  { ...placing initial values in edit boxes }
  EB_AppliedLoad.text := Old_AppliedLoad;
  EB_BeamWidth.text := Old_BeamWidth;
  EB_Thickness.text := Old_Thickness;
  EB_DistancebtGage.text := Old_DistanceGage;
  EB_Modulus.text := Old_Modulus;
  EB_GageLength.text := Old_GageLength;
  EB_GageFactor.text := Old_GageFactor;
  ST_Average.caption := Old_AvgStrain;
  ST_Gradient.caption := Old_Gradient;
  ST_FullSpan.caption := Old_FullSpan;
  close;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.BN_ComputeClick }
procedure TReverseBBFrm.BN_ComputeClick(Sender: TObject);
const
  MINAPPLIEDLOAD_US = 0.0000;
  MAXAPPLIEDLOAD_US = 10000;
  MINBEAMWIDTH_US = 0.020;
  MAXBEAMWIDTH_US = 10.0;
  MINTHICKNESS_US = 0.003;
  MAXTHICKNESS_US = 5.0;
  MINDISTHOLES_US = 0.10;
  MAXDISTHOLES_US = 100;
  MINMODULUS_US = 5000000;
  MAXMODULUS_US = 50000000;
  MINGAGELENGTH_US = 0.008;
  MAXGAGELENGTH_US = 1;
  MINGAGEFACTOR_US = 1.0;
  MAXGAGEFACTOR_US = 5.0;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH] of char;
  ErrorUnit: array [0 .. MAXERRORLENGTH] of char;
  ErrorAnd: array [0 .. MAXERRORLENGTH] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH] of char;
  StrUnit: string;
  StrAnd: string;
  StrMsg: string;
  StrMin: string;
  strMax: string;
  EditStrings: string;
  MinAppliedLoad: RealType;
  MaxAppliedLoad: RealType;
  MinBeamWidth: RealType;
  MaxBeamWidth: RealType;
  MinThickness: RealType;
  MaxThickness: RealType;
  MinDistHoles: RealType;
  MaxDistHoles: RealType;
  MinModulus: RealType;
  MaxModulus: RealType;
  MinGageLength: RealType;
  MaxGageLength: RealType;
  MinGageFactor: RealType;
  MaxGageFactor: RealType;
  ErrorCode: integer;
  Button: integer;
begin
  { ...Determining which units to use std. or si for min and max units }
  if MainForm.UnitsAreUS = true then
  begin
    MinAppliedLoad := MINAPPLIEDLOAD_US;
    MaxAppliedLoad := MAXAPPLIEDLOAD_US;
    MinBeamWidth := MINBEAMWIDTH_US;
    MaxBeamWidth := MAXBEAMWIDTH_US;
    MinThickness := MINTHICKNESS_US;
    MaxThickness := MAXTHICKNESS_US;
    MinDistHoles := MINDISTHOLES_US;
    MaxDistHoles := MAXDISTHOLES_US;
    MinModulus := MINMODULUS_US;
    MaxModulus := MAXMODULUS_US;
    MinGageLength := MINGAGELENGTH_US;
    MaxGageLength := MAXGAGELENGTH_US;
    MinGageFactor := MINGAGEFACTOR_US;
    MaxGageFactor := MAXGAGEFACTOR_US;
  end
  else
  begin
    MinAppliedLoad := LbF_To_N(MINAPPLIEDLOAD_US);
    MaxAppliedLoad := LbF_To_N(MAXAPPLIEDLOAD_US);
    MinBeamWidth := Inches_To_mm(MINBEAMWIDTH_US);
    MaxBeamWidth := Inches_To_mm(MAXBEAMWIDTH_US);
    MinThickness := Inches_To_mm(MINTHICKNESS_US);
    MaxThickness := Inches_To_mm(MAXTHICKNESS_US);
    MinDistHoles := Inches_To_mm(MINDISTHOLES_US);
    MaxDistHoles := Inches_To_mm(MAXDISTHOLES_US);
    MinModulus := PSI_To_GPa(MINMODULUS_US);
    MaxModulus := PSI_To_GPa(MAXMODULUS_US);
    MinGageLength := Inches_To_mm(MINGAGELENGTH_US);
    MaxGageLength := Inches_To_mm(MAXGAGELENGTH_US);
    MinGageFactor := MINGAGEFACTOR_US;
    MaxGageFactor := MAXGAGEFACTOR_US;
  end;
  ST_Average.caption := '';
  ST_Gradient.caption := '';
  ST_FullSpan.caption := '';
  { ...checking Applied Load to see if valid }
  IsThereAnError := false;
  EditStrings := EB_AppliedLoad.text;
  StrVal(EditStrings, Load, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedLoad.setfocus;
    EB_AppliedLoad.clearselection;
    exit;
  end
  else if (Load < MinAppliedLoad) or (Load > MaxAppliedLoad) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_USLBF, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_N, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_AppliedLoad, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinAppliedLoad, ffFixed, 8, 3);
    strMax := floattostrf(MaxAppliedLoad, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedLoad.setfocus;
    EB_AppliedLoad.clearselection;
    exit;
  end;
  { ..checking Beam Width to see if valid }
  EditStrings := EB_BeamWidth.text;
  StrVal(EditStrings, width, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_BeamWidth.setfocus;
    EB_BeamWidth.clearselection;
    exit;
  end
  else if (width < MinBeamWidth) or (width > MaxBeamWidth) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_BeamWidth, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinBeamWidth, ffFixed, 8, 3);
    strMax := floattostrf(MaxBeamWidth, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_BeamWidth.setfocus;
    EB_BeamWidth.clearselection;
    exit;
  end;
  { ...checking to see if Thickness is valid }
  EditStrings := EB_Thickness.text;
  StrVal(EditStrings, thick, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Thickness.setfocus;
    EB_Thickness.clearselection;
    exit;
  end
  else if (thick < MinThickness) or (thick > MaxThickness) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_Thickness, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinThickness, ffFixed, 8, 3);
    strMax := floattostrf(MaxThickness, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Thickness.setfocus;
    EB_Thickness.clearselection;
    exit;
  end;
  { ...checking to see if Distance between gages is valid }
  EditStrings := EB_DistancebtGage.text;
  StrVal(EditStrings, Distance, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DistancebtGage.setfocus;
    EB_DistancebtGage.clearselection;
    exit;
  end
  else if (Distance < MinDistHoles) or (Distance > MaxDistHoles) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_DistBtHoles, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinDistHoles, ffFixed, 8, 3);
    strMax := floattostrf(MaxDistHoles, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DistancebtGage.setfocus;
    EB_DistancebtGage.clearselection;
    exit;
  end;
  { ...checking to see if Modulus value is valid }
  EditStrings := EB_Modulus.text;
  StrVal(EditStrings, elasticity, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Modulus.setfocus;
    EB_Modulus.clearselection;
    exit;
  end
  else if (elasticity < MinModulus) or (elasticity > MaxModulus) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_PSI, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_GPa, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_Modulus, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinModulus, ffFixed, 8, 3);
    strMax := floattostrf(MaxModulus, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Modulus.setfocus;
    EB_Modulus.clearselection;
    exit;
  end;
  if MainForm.UnitsAreUS = false then
  begin
    elasticity := elasticity * 1000;
  end;
  { ...checking to see if Gage Length is valid }
  EditStrings := EB_GageLength.text;
  StrVal(EditStrings, length, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageLength.setfocus;
    EB_GageLength.clearselection;
    exit;
  end
  else if (length < MinGageLength) or (length > MaxGageLength) then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_GageLength, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinGageLength, ffFixed, 8, 3);
    strMax := floattostrf(MaxGageLength, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageLength.setfocus;
    EB_GageLength.clearselection;
    exit;
  end;
  { ...checking to see if Gage Factor is valid }
  EditStrings := EB_GageFactor.text;
  StrVal(EditStrings, Factor, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end
  else if (Factor < MinGageFactor) or (length > MaxGageFactor) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_GageFactor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinGageFactor, ffFixed, 8, 2);
    strMax := floattostrf(MaxGageFactor, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end;
  (* Removed CSS as per JRW
    {...checking to make sure Width is not greater than Distance to GageCL}
    if (Width > Distance) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_WidthExceedsGCL, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DistancebtGage.setfocus;
    EB_DistancebtGage.clearselection;
    exit;
    end;
  *)
  { ...checking to make sure Thickness is not greater than Width }
  if thick > width then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_WidthExceedsThick, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Thickness.setfocus;
    EB_Thickness.clearselection;
    exit;
  end;
  (* Removed CSS as per JRW
    {...checking to make sure GL/2 is not greater than Distance from Load to Gage CL}
    if (Length/2) > (Distance/2) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_LoadtoGageCLsTooSmall, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_DistancebtGage.setfocus;
    EB_DistancebtGage.clearselection;
    exit;
    end;
  *)
  { ...checking to make sure L/W > 2 }
  if (Distance / width) < 2 then
  begin
    LoadString(hinstance, ID_SZ_ReverseLDivW, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
  end;
  { ...doing calculations }
  if IsThereAnError = false then
  begin
    { ...Minimum Strain }
    EMin := Min_Strain;
    { ...Maximum Strain }
    EMax := Max_Strain;
    { ...Average Strain }
    EAvg := Avg_Strain;
    if abs(EAvg) < 5000 then
    begin
      if ExceptionRaised = false then
      begin
        AvgStrainText := floattostrf(abs(EAvg), ffFixed, 4, 0);
        ST_Average.caption := AvgStrainText;
      end;
    end
    else
    begin
      LoadString(hinstance, ID_SZ_Impratical, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ST_Average.caption := '';
      ST_Gradient.caption := '';
      ST_FullSpan.caption := '';
      ModalResult := 0;
      exit;
    end;
    { ...Gradient }
    TheGradient := CalculateGradient;
    if ExceptionRaised = false then
    begin
      GradientText := floattostrf(TheGradient, ffFixed, 4, 1);
      ST_Gradient.caption := GradientText;
    end;
    { ...Full Bridge Sensitivity }
    FullSensitivity := FullBridgeSensitivity;
    if ExceptionRaised = false then
    begin
      SensitiveText := floattostrf(FullSensitivity, ffFixed, 4, 3);
      ST_FullSpan.caption := SensitiveText;
    end;
    if abs(EAvg) > 1700 then
    begin
      LoadString(hinstance, ID_SZ_StrainExceeds1700, ErrorMsg,
        sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ModalResult := 0;
    end;
  end;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.FormActivate }
procedure TReverseBBFrm.FormActivate(Sender: TObject);
var
  EditStrings: string;
  i: integer;
  TheItem: TacStreamable;
begin
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TReverseBendingBeam then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { ...if there is object, then place the value in edit boxes }
  if TheItem <> nil then
  begin
    EB_AppliedLoad.text := (TheItem as TReverseBendingBeam).AppliedLoad;
    EB_BeamWidth.text := (TheItem as TReverseBendingBeam).BeamWidth;
    EB_Thickness.text := (TheItem as TReverseBendingBeam).Thickness;
    EB_DistancebtGage.text := (TheItem as TReverseBendingBeam).DistanceGage;
    EB_Modulus.text := (TheItem as TReverseBendingBeam).Modulus;
    EB_GageLength.text := (TheItem as TReverseBendingBeam).GageLength;
    EB_GageFactor.text := (TheItem as TReverseBendingBeam).GageFactor;
    ST_Average.caption := (TheItem as TReverseBendingBeam).AvgStrain;
    ST_Gradient.caption := (TheItem as TReverseBendingBeam).Gradient;
    ST_FullSpan.caption := (TheItem as TReverseBendingBeam).FullSpan;
  end;
  { ...placing initial values in old variables }
  Old_AppliedLoad := EB_AppliedLoad.text;
  Old_BeamWidth := EB_BeamWidth.text;
  Old_Thickness := EB_Thickness.text;
  Old_DistanceGage := EB_DistancebtGage.text;
  Old_Modulus := EB_Modulus.text;
  Old_GageLength := EB_GageLength.text;
  Old_GageFactor := EB_GageFactor.text;
  Old_AvgStrain := ST_Average.caption;
  Old_Gradient := ST_Gradient.caption;
  Old_FullSpan := ST_FullSpan.caption;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.BN_OKClick }
procedure TReverseBBFrm.BN_OKClick(Sender: TObject);
var
  TheItem: TacStreamable;
  i: integer;
  j: integer;
begin
  BN_ComputeClick(Sender);
  if (IsThereAnError = true) then
  begin
    exit;
  end;
  MainForm.DesignChosen := true;
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TReverseBendingBeam then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { ...if there is object, then place the value in edit boxes }
  if TheItem = nil then
  begin
    { ...placing values in object }
    ReverseBBeamObject := TReverseBendingBeam.create;
    ReverseBBeamObject.AppliedLoad := EB_AppliedLoad.text;
    ReverseBBeamObject.BeamWidth := EB_BeamWidth.text;
    ReverseBBeamObject.Thickness := EB_Thickness.text;
    ReverseBBeamObject.DistanceGage := EB_DistancebtGage.text;
    ReverseBBeamObject.Modulus := EB_Modulus.text;
    ReverseBBeamObject.GageLength := EB_GageLength.text;
    ReverseBBeamObject.GageFactor := EB_GageFactor.text;
    ReverseBBeamObject.AvgStrain := ST_Average.caption;
    ReverseBBeamObject.Gradient := ST_Gradient.caption;
    ReverseBBeamObject.FullSpan := ST_FullSpan.caption;
    MainForm.AddToLog(ReverseBBeamObject);
    j := 0;
    { ...placing associated string in outline }
    repeat
      inc(j);
    until (MainForm.XCalcOutline.Items[j].text = 'Design Verification') or
      (j > MainForm.XCalcOutline.ItemCount);
    MainForm.XCalcOutline.AddChild(j, ReverseBBeamObject.GetAsString);
  end
  else
  begin
    (TheItem as TReverseBendingBeam).AppliedLoad := EB_AppliedLoad.text;
    (TheItem as TReverseBendingBeam).BeamWidth := EB_BeamWidth.text;
    (TheItem as TReverseBendingBeam).Thickness := EB_Thickness.text;;
    (TheItem as TReverseBendingBeam).DistanceGage := EB_DistancebtGage.text;
    (TheItem as TReverseBendingBeam).Modulus := EB_Modulus.text;
    (TheItem as TReverseBendingBeam).GageLength := EB_GageLength.text;
    (TheItem as TReverseBendingBeam).GageFactor := EB_GageFactor.text;
    (TheItem as TReverseBendingBeam).AvgStrain := ST_Average.caption;
    (TheItem as TReverseBendingBeam).Gradient := ST_Gradient.caption;
    (TheItem as TReverseBendingBeam).FullSpan := ST_FullSpan.caption;
  end;
  MainForm.IsDirty := true;
  close;
  if MainForm.DesignDlgShowing = true then
  begin
    DesignDlg.close;
  end;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.FormClose }
procedure TReverseBBFrm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.EB_AppliedLoadExit }
procedure TReverseBBFrm.EB_AppliedLoadExit(Sender: TObject);
var
  ForceUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
  ForceText: string;
  ForceValue: double;
  ErrorCode: integer;
begin
  if MainForm.UnitsAreUS = false then
  begin
    ForceText := EB_AppliedLoad.text;
    StrVal(ForceText, ForceValue, ErrorCode);
    if ErrorCode <> 0 then
    begin
      exit;
    end;
    ForceValue := ForceValue * 0.101971;
    // str(ForceValue:4:3, ForceText);
    ForceText := format('%4.3f', [ForceValue]);
    ST_KGF.caption := ForceText;
    LoadString(hinstance, ID_SZ_MetricKg, ForceUnit, sizeof(ForceUnit));
    ST_KGFUnit.caption := ForceUnit;
  end
  else
  begin
    ST_KGF.caption := '';
    ST_KGFUnit.caption := '';
  end;
end;

(* ********************************************************************* *)
{ TReverseBBFrm.BN_PrintClick }
procedure TReverseBBFrm.BN_PrintClick(Sender: TObject);
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
  Stream := tResourceStream.create(hinstance, 'RevBB', RT_RCDATA);
  strstream := tStringStream.create();

  try
    strstream.LoadFromStream(Stream);
    htmlText := strstream.DataString;
  finally
    strstream.Free();
    Stream.Free();
  end;
  htmlText := StringReplace(htmlText, '$af2', ST_AppliedLoadUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$bw2', ST_BeamWidthUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$bt2', ST_ThicknessUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$cl2', ST_DistancebtGageUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$me2', ST_ModulusUnits.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$gl2', ST_GageLengthUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);

  htmlText := StringReplace(htmlText, '$af1', EB_AppliedLoad.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$bw1', EB_BeamWidth.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$bt1', EB_Thickness.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$cl1', EB_DistancebtGage.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$me1', EB_Modulus.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$gl1', EB_GageLength.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$gf1', EB_GageFactor.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$gs1', ST_Average.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$sv1', ST_Gradient.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$sf1', ST_FullSpan.caption,
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
  { ...clearing sheet for new values }
  (* SSClearRange(Sheet1.SS, 4, 5, 17, 5, 3);
    {placing Units on sheet}
    SSSetActiveCell(Sheet1.SS, 4, 6);
    Sheet1.text := ST_AppliedLoadUnit.caption;
    SSSetActiveCell(Sheet1.SS, 6, 6);
    Sheet1.text := ST_BeamWidthUnit.caption;
    SSSetActiveCell(Sheet1.SS, 7, 6);
    Sheet1.text := ST_ThicknessUnit.caption;
    SSSetActiveCell(Sheet1.SS, 8, 6);
    Sheet1.text := ST_DistancebtGageUnit.caption;
    SSSetActiveCell(Sheet1.SS, 9, 6);
    Sheet1.text := ST_ModulusUnits.caption;
    SSSetActiveCell(Sheet1.SS, 11, 6);
    Sheet1.text := ST_GageLengthUnit.caption;
    SSSetActiveCell(Sheet1.SS, 4, 5);
    Sheet1.text := EB_AppliedLoad.text;
    SSSetActiveCell(Sheet1.SS, 6, 5);
    Sheet1.text := EB_BeamWidth.text;
    SSSetActiveCell(Sheet1.SS, 7, 5);
    Sheet1.text := EB_Thickness.text;
    SSSetActiveCell(Sheet1.SS, 8, 5);
    Sheet1.text := EB_DistanceBtGage.text;
    SSSetActiveCell(Sheet1.SS, 9, 5);
    Sheet1.text := EB_Modulus.text;
    SSSetActiveCell(Sheet1.SS, 11, 5);
    Sheet1.text := EB_GageLength.text;
    SSSetActiveCell(Sheet1.SS, 12, 5);
    Sheet1.text := EB_GageFactor.text;
    SSSetActiveCell(Sheet1.SS, 15, 5);
    Sheet1.text := ST_Average.caption;
    SSSetActiveCell(Sheet1.SS, 16, 5);
    Sheet1.text := ST_Gradient.caption;
    SSSetActiveCell(Sheet1.SS, 17, 5);
    Sheet1.text := ST_FullSpan.caption;
    sserror := SSObjNewPicture(Sheet1.ss, 2, 20, 5.57, 29, id, Image1.Picture.Metafile.handle, 8, 0, 0);
    SSSetPrintFooter(Sheet1.SS, '&04&LTransCalc™' + #13#10 + 'Measurements Group, Inc.');
    DateString := FormatDateTime('mmmm dd, yyyy' , Date);
    HeaderString := '&04&L' + MainForm.SaveFileName +  + '&R' + DateString;
    strpcopy(HeaderPChar, HeaderString);
    SSSetPrintHeader(Sheet1.SS, HeaderPChar);
    SSSetPrintArea(Sheet1.ss, '$A$1:$G$30');
    SSFilePrint(Sheet1.ss, 0); *)
end;

(* ********************************************************************* *)
{ TReverseBBFrm.BN_HelpClick }
procedure TReverseBBFrm.BN_HelpClick(Sender: TObject);
begin
  Application.HelpContext(1020);
end;

begin
  { ...registering object }
  RegisterClasses([TReverseBendingBeam]);

end.
