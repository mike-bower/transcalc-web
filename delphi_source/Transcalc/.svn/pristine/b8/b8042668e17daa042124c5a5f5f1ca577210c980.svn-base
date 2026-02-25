(* ********************************************* *)
(* Pressure Diaphragm Unit *)
(* ********************************************* *)
unit Pressure;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, acStream, acList, Log, LogItem, LogStrm,
  Printers, Vcl.Dialogs, ioUtils, ShellAPI;

const
  MAXTEXTLENGTH = 40;
  MAXERRORLENGTH = 255;

type
  RealType = double;

  (* ********************************************* *)
  (* TPressure Object *)
  (* ********************************************* *)
type
  TPressure = class(TLogItem)
  private
    FAppliedPressure: shortstring;
    FThickness: shortstring;
    FDiameter: shortstring;
    FPoisson: shortstring;
    FModulus: shortstring;
    FRadial: shortstring;
    FTangential: shortstring;
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
    property AppliedPressure: shortstring read FAppliedPressure
      write FAppliedPressure;
    property Thickness: shortstring read FThickness write FThickness;
    property Diameter: shortstring read FDiameter write FDiameter;
    property Poisson: shortstring read FPoisson write FPoisson;
    property Modulus: shortstring read FModulus write FModulus;
    property Radial: shortstring read FRadial write FRadial;
    property Tangential: shortstring read FTangential write FTangential;
    property TheStringText: shortstring read TheString write TheString;
  end;

  (* ********************************************* *)
  (* TPressureFrm Form Object *)
  (* ********************************************* *)
type
  TPressureFrm = class(TForm)
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    Panel1: TPanel;
    GroupBox1: TGroupBox;
    ST_PressureUnit: TLabel;
    EB_AppliedPressure: TEdit;
    GroupBox2: TGroupBox;
    Label1: TLabel;
    ST_ThicknessUnit: TLabel;
    Label2: TLabel;
    ST_RadiusUnit: TLabel;
    EB_Thickness: TEdit;
    EB_Diameter: TEdit;
    GroupBox3: TGroupBox;
    EB_Poisson: TEdit;
    Panel2: TPanel;
    GroupBox5: TGroupBox;
    Label5: TLabel;
    Label6: TLabel;
    Label17: TLabel;
    Label18: TLabel;
    BN_Compute: TBitBtn;
    ST_Radial: TLabel;
    ST_Tangential: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    ST_ModulusUnit: TLabel;
    EB_Modulus: TEdit;
    BN_Picture: TBitBtn;
    BN_help: TBitBtn;
    BN_Print: TBitBtn;
    Image1: TImage;
    SaveDialogPrint: TSaveDialog;
    // Sheet1: TSheet;
    procedure FormCreate(Sender: TObject);
    procedure BN_ComputeClick(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    function CalculateRadial: RealType;
    function CalculateTangential: RealType;
    procedure BN_PictureClick(Sender: TObject);
    procedure FormClose(Sender: TObject; var Action: TCloseAction);
    procedure BN_PrintClick(Sender: TObject);
    procedure BN_helpClick(Sender: TObject);
  private
    Old_AppliedPressure: string;
    Old_Thickness: string;
    Old_Diameter: string;
    Old_Poisson: string;
    Old_Modulus: string;
    Old_Radial: string;
    Old_Tangential: string;
    RadialText: string;
    TangentialText: string;
    IsThereAnError: boolean;
    ExceptionRaised: boolean;
    Pressure: RealType;
    Thick: RealType;
    TheDiameter: RealType;
    Ratio: RealType;
    Elasticity: RealType;
    Length: RealType;
    RadialE: RealType;
    TangentialE: RealType;
  public
    PressureObject: TPressure;
    PressureChosen: boolean;
  end;

var
  PressureFrm: TPressureFrm;

implementation

uses MainMenu, Convert, Diapragm, Design;
{$R *.DFM}

(* ********************************************* *)
(* Pressure Object Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TPressure.create }
constructor TPressure.create;
begin
  { ...create object }
  inherited create;
  { ...associate string with object }
  TheString := 'Pressure - Diaphragm'
end;

(* ********************************************************************* *)
{ TPressure.destroy }
destructor TPressure.destroy;
begin
  { ...destroying object }
  inherited destroy;
end;

(* ********************************************************************* *)
{ TPressure.GetAsString }
function TPressure.GetAsString: string;
begin
  Result := TheString;
end;

(* ********************************************************************* *)
{ TPressure.ShowTheForm }
procedure TPressure.ShowTheForm;
begin
  Application.CreateForm(TPressureFrm, PressureFrm);
  PressureFrm.showmodal;
end;

(* ********************************************************************* *)
{ TPressure.PrintTheForm }
procedure TPressure.PrintTheForm;
var
  Sender: TObject;
begin
  Sender := self;
  Application.CreateForm(TPressureFrm, PressureFrm);
  PressureFrm.visible := false;
  PressureFrm.FormActivate(Sender);
  PressureFrm.BN_PrintClick(Sender);
  PressureFrm.BN_CancelClick(Sender);
end;

(* ********************************************************************* *)
{ TPressure.AssignTo }
procedure TPressure.AssignTo(Dest: TPersistent);
begin
  if (Dest is TPressure) and (self is Dest.ClassType) then
  begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TPressure do
    begin
      FAppliedPressure := self.FAppliedPressure;
      FThickness := self.FThickness;
      FDiameter := self.FDiameter;
      FPoisson := self.FPoisson;
      FModulus := self.FModulus;
      FRadial := self.Radial;
      FTangential := self.Tangential;
      TheString := self.TheString;
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

(* ********************************************************************* *)
{ TPressure.InitFields }
procedure TPressure.InitFields;
begin
  inherited InitFields;
end;

(* ********************************************************************* *)
{ TPressure.SaveToStream }
procedure TPressure.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FAppliedPressure, sizeof(shortstring));
  Stream.SaveBuffer(FThickness, sizeof(shortstring));
  Stream.SaveBuffer(FDiameter, sizeof(shortstring));
  Stream.SaveBuffer(FPoisson, sizeof(shortstring));
  Stream.SaveBuffer(FModulus, sizeof(shortstring));
  Stream.SaveBuffer(FRadial, sizeof(shortstring));
  Stream.SaveBuffer(FTangential, sizeof(shortstring));
  Stream.SaveBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************************************* *)
{ TPressure.ReadFromStream }
procedure TPressure.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FAppliedPressure, sizeof(shortstring));
  Stream.ReadBuffer(FThickness, sizeof(shortstring));
  Stream.ReadBuffer(FDiameter, sizeof(shortstring));
  Stream.ReadBuffer(FPoisson, sizeof(shortstring));
  Stream.ReadBuffer(FModulus, sizeof(shortstring));
  Stream.ReadBuffer(FRadial, sizeof(shortstring));
  Stream.ReadBuffer(FTangential, sizeof(shortstring));
  Stream.ReadBuffer(TheString, sizeof(shortstring));
end;

(* ********************************************* *)
(* Pressure Form Methods *)
(* ********************************************* *)

(* ********************************************************************* *)
{ TPressureFrm.BN_PictureClick }
procedure TPressureFrm.BN_PictureClick(Sender: TObject);
begin
  Application.CreateForm(TStrainDistForm, StrainDistForm);
  StrainDistForm.showmodal;
end;

(* ********************************************************************* *)
{ TPressureFrm.CalculateRadial }
function TPressureFrm.CalculateRadial: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  RadialResult: RealType;
  Button: integer;
begin
  RadialResult := 0.0;
  ExceptionRaised := false;
  Numerator := (-3 * Pressure * sqr(TheDiameter / 2)) * (1 - sqr(Ratio));
  Denominator := 4 * sqr(Thick) * Elasticity;
  try
    RadialResult := (Numerator / Denominator) * 1E6;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoRadialStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  CalculateRadial := RadialResult;
end;

(* ********************************************************************* *)
{ TPressureFrm.CalculateTangential }
function TPressureFrm.CalculateTangential: RealType;
var
  ErrorMsg: array [0 .. MAXERRORLENGTH - 1] of char;
  ErrorCaption: array [0 .. MAXERRORLENGTH - 1] of char;
  Numerator: RealType;
  Denominator: RealType;
  TangentResult: RealType;
  Button: integer;
begin
  TangentResult := 0.0;
  ExceptionRaised := false;
  Numerator := (3 * Pressure * sqr(TheDiameter / 2)) * (1 - sqr(Ratio));
  Denominator := 8 * sqr(Thick) * Elasticity;
  try
    TangentResult := (Numerator / Denominator) * 1E6;
  except
    on EMathError do
    begin
      LoadString(hinstance, ID_SZ_NoTangentStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  CalculateTangential := TangentResult;
end;

(* ********************************************************************* *)
{ TPressureFrm.FormCreate }
procedure TPressureFrm.FormCreate(Sender: TObject);
var
  PressureUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
  DimensionUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
  ModulusUnit: array [0 .. MAXTEXTLENGTH - 1] of char;
begin
  { ...deciding which units to use on form units }
  if MainForm.UnitsAreUS = true then
  begin
    LoadString(hinstance, ID_SZ_PSI, PressureUnit, sizeof(PressureUnit));
    LoadString(hinstance, ID_SZ_Inches, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_PSI, ModulusUnit, sizeof(ModulusUnit));
  end
  else
  begin
    LoadString(hinstance, ID_SZ_Pascals, PressureUnit, sizeof(PressureUnit));
    LoadString(hinstance, ID_SZ_MM, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_GPa, ModulusUnit, sizeof(ModulusUnit));
  end;
  { ...placing units on form }
  ST_PressureUnit.caption := PressureUnit;
  ST_ThicknessUnit.caption := DimensionUnit;
  ST_RadiusUnit.caption := DimensionUnit;
  ST_ModulusUnit.caption := ModulusUnit;
  Font.Name := 'MS Sans Serif';
  Font.Size := 8;
end;

(* ********************************************************************* *)
{ TPressureFrm.BN_ComputeClick }
procedure TPressureFrm.BN_ComputeClick(Sender: TObject);
const
  MINAPPLIEDPRESSURE_US = 0.0000;
  MAXAPPLIEDPRESSURE_US = 100000;
  MINTHICKNESS_US = 0.010;
  MAXTHICKNESS_US = 1.000;
  MINDIAMETER_US = 0.182;
  MAXDIAMETER_US = 10.00;
  MINPOISSON_US = 0.1;
  MAXPOISSON_US = 0.4;
  MINMODULUS_US = 5000000;
  MAXMODULUS_US = 50000000;
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
  MinAppliedPressure: RealType;
  MaxAppliedPressure: RealType;
  MinThickness: RealType;
  MaxThickness: RealType;
  MinDiameter: RealType;
  MaxDiameter: RealType;
  MinPoisson: RealType;
  MaxPoisson: RealType;
  MinModulus: RealType;
  MaxModulus: RealType;
  ErrorCode: integer;
  Button: integer;
begin
  { ...Determining which units to use std. or si for min and max values }
  if MainForm.UnitsAreUS = true then
  begin
    MinAppliedPressure := MINAPPLIEDPRESSURE_US;
    MaxAppliedPressure := MAXAPPLIEDPRESSURE_US;
    MinThickness := MINTHICKNESS_US;
    MaxThickness := MAXTHICKNESS_US;
    MinDiameter := MINDIAMETER_US;
    MaxDiameter := MAXDIAMETER_US;
    MinPoisson := MINPOISSON_US;
    MaxPoisson := MAXPOISSON_US;
    MinModulus := MINMODULUS_US;
    MaxModulus := MAXMODULUS_US;
  end
  else
  begin
    MinAppliedPressure := (MINAPPLIEDPRESSURE_US * 0.0068947);
    { convert psi to MPa }
    MaxAppliedPressure := (MAXAPPLIEDPRESSURE_US * 0.0068947);
    { convert psi to MPa }
    MinThickness := Inches_To_mm(MINTHICKNESS_US);
    MaxThickness := Inches_To_mm(MAXTHICKNESS_US);
    MinDiameter := Inches_To_mm(MINDIAMETER_US);
    MaxDiameter := Inches_To_mm(MAXDIAMETER_US);
    MinPoisson := MINPOISSON_US;
    MaxPoisson := MAXPOISSON_US;
    MinModulus := PSI_To_GPa(MINMODULUS_US);
    MaxModulus := PSI_To_GPa(MAXMODULUS_US);
  end;
  ST_Radial.caption := '';
  ST_Tangential.caption := '';
  { ...checking Applied Pressure to see if valid }
  IsThereAnError := false;
  EditStrings := EB_AppliedPressure.text;
  StrVal(EditStrings, Pressure, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedPressure.setfocus;
    EB_AppliedPressure.clearselection;
    exit;
  end
  else if (Pressure < MinAppliedPressure) or (Pressure > MaxAppliedPressure)
  then
  begin
    IsThereAnError := true;
    if MainForm.UnitsAreUS = true then
    begin
      LoadString(hinstance, ID_SZ_PSI, ErrorUnit, sizeof(ErrorMsg));
    end
    else
    begin
      LoadString(hinstance, ID_SZ_Pascals, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_AppliedPressure, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinAppliedPressure, ffFixed, 8, 1);
    strMax := floattostrf(MaxAppliedPressure, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedPressure.setfocus;
    EB_AppliedPressure.clearselection;
    exit;
  end;
  { ...checking Thickness to see if valid }
  EditStrings := EB_Thickness.text;
  StrVal(EditStrings, Thick, ErrorCode);
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
  else if (Thick < MinThickness) or (Thick > MaxThickness) then
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
    LoadString(hinstance, ID_SZ_DiaThickness, ErrorMsg, sizeof(ErrorMsg));
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
  { ...checking Radius to see if valid }
  EditStrings := EB_Diameter.text;
  StrVal(EditStrings, TheDiameter, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Diameter.setfocus;
    EB_Diameter.clearselection;
    exit;
  end
  else if (TheDiameter < MinDiameter) or (TheDiameter > MaxDiameter) then
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
    LoadString(hinstance, ID_SZ_Diameter, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinDiameter, ffFixed, 8, 3);
    strMax := floattostrf(MaxDiameter, ffFixed, 8, 1);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax + ' '
      + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Diameter.setfocus;
    EB_Diameter.clearselection;
    exit;
  end;
  { ...checking Poisson to see if valid }
  EditStrings := EB_Poisson.text;
  StrVal(EditStrings, Ratio, ErrorCode);
  if ErrorCode <> 0 then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Poisson.setfocus;
    EB_Poisson.clearselection;
    exit;
  end
  else if (Ratio < MinPoisson) or (Ratio > MaxPoisson) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_Poisson, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostrf(MinPoisson, ffFixed, 8, 3);
    strMax := floattostrf(MaxPoisson, ffFixed, 8, 3);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + strMax;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Poisson.setfocus;
    EB_Poisson.clearselection;
    exit;
  end;
  { ...checking to see if Modulus value is valid }
  EditStrings := EB_Modulus.text;
  StrVal(EditStrings, Elasticity, ErrorCode);
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
  else if (Elasticity < MinModulus) or (Elasticity > MaxModulus) then
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
    strMax := floattostrf(MaxModulus, ffFixed, 8, 3);
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
    Elasticity := Elasticity * 1000;
  end;
  { ...Diaphragm thickness exceeds diameter }
  if (Thick > TheDiameter) then
  begin
    IsThereAnError := true;
    LoadString(hinstance, ID_SZ_DiameterThickness, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption,
      mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Diameter.setfocus;
    EB_Diameter.clearselection;
    exit;
  end;
  { ...doing calculations }
  if IsThereAnError = false then
  begin
    { ...Axial Strain }
    RadialE := CalculateRadial;
    if abs(RadialE) < 5000 then
    begin
      if ExceptionRaised = false then
      begin
        RadialText := floattostrf(RadialE, ffFixed, 4, 0);
        ST_Radial.caption := RadialText;
      end;
    end
    else
    begin
      LoadString(hinstance, ID_SZ_Impratical, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ST_Radial.caption := '';
      ST_Tangential.caption := '';
      ModalResult := 0;
      exit;
    end;
    { ...Transverse Strain }
    TangentialE := CalculateTangential;
    if abs(TangentialE) < 5000 then
    begin
      if ExceptionRaised = false then
      begin
        TangentialText := floattostrf(TangentialE, ffFixed, 4, 0);
        ST_Tangential.caption := TangentialText;
      end;
    end
    else
    begin
      LoadString(hinstance, ID_SZ_Impratical, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption,
        mb_OK or mb_IconExclamation);
      ST_Radial.caption := '';
      ST_Tangential.caption := '';
      ModalResult := 0;
      exit;
    end;
    if abs(RadialE) > 1700 then
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
{ TPressureFrm.BN_CancelClick }
procedure TPressureFrm.BN_CancelClick(Sender: TObject);
begin
  { ...placing initial values in edit boxes }
  EB_AppliedPressure.text := Old_AppliedPressure;
  EB_Thickness.text := Old_Thickness;
  EB_Diameter.text := Old_Diameter;
  EB_Poisson.text := Old_Poisson;
  EB_Modulus.text := Old_Modulus;
  ST_Radial.caption := Old_Radial;
  ST_Tangential.caption := Old_Tangential;
  close;
end;

(* ********************************************************************* *)
{ TPressureFrm.FormActivate }
procedure TPressureFrm.FormActivate(Sender: TObject);
var
  EditStrings: string;
  i: integer;
  TheItem: TacStreamable;
begin
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TPressure then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { ...if there is object, then placing values in edit boxes }
  if TheItem <> nil then
  begin
    EB_AppliedPressure.text := (TheItem as TPressure).AppliedPressure;
    EB_Thickness.text := (TheItem as TPressure).Thickness;
    EB_Diameter.text := (TheItem as TPressure).Diameter;
    EB_Poisson.text := (TheItem as TPressure).Poisson;
    EB_Modulus.text := (TheItem as TPressure).Modulus;
    ST_Radial.caption := (TheItem as TPressure).Radial;
    ST_Tangential.caption := (TheItem as TPressure).Tangential;
  end;
  { ...placing initial values in old variables }
  Old_AppliedPressure := EB_AppliedPressure.text;
  Old_Thickness := EB_Thickness.text;
  Old_Diameter := EB_Diameter.text;
  Old_Poisson := EB_Poisson.text;
  Old_Modulus := EB_Modulus.text;
  Old_Radial := ST_Radial.caption;
  Old_Tangential := ST_Tangential.caption;
end;

(* ********************************************************************* *)
{ TPressureFrm.BN_OKClick }
procedure TPressureFrm.BN_OKClick(Sender: TObject);
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
  MainForm.DesignChosen := true;
  { getting item from object if there is one }
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TPressure then
    begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.FLog.Count);
  { ...if there is object, then placing values in edit boxes }
  if TheItem = nil then
  begin
    { ...placing values in object }
    PressureObject := TPressure.create;
    PressureObject.AppliedPressure := EB_AppliedPressure.text;
    PressureObject.Thickness := EB_Thickness.text;
    PressureObject.Diameter := EB_Diameter.text;
    PressureObject.Poisson := EB_Poisson.text;
    PressureObject.Modulus := EB_Modulus.text;
    PressureObject.Radial := ST_Radial.caption;
    PressureObject.Tangential := ST_Tangential.caption;
    MainForm.AddToLog(PressureObject);
    j := 0;
    { ...placing associated string in outline component }
    repeat
      inc(j);
    until (MainForm.XCalcOutline.Items[j].text = 'Design Verification') or
      (j > MainForm.XCalcOutline.ItemCount);
    MainForm.XCalcOutline.AddChild(j, PressureObject.GetAsString);
  end
  else
  begin
    (TheItem as TPressure).AppliedPressure := EB_AppliedPressure.text;
    (TheItem as TPressure).Thickness := EB_Thickness.text;
    (TheItem as TPressure).Diameter := EB_Diameter.text;
    (TheItem as TPressure).Poisson := EB_Poisson.text;
    (TheItem as TPressure).Modulus := EB_Modulus.text;
    (TheItem as TPressure).Radial := ST_Radial.caption;
    (TheItem as TPressure).Tangential := ST_Tangential.caption;
  end;
  MainForm.IsDirty := true;
  close;
  if MainForm.DesignDlgShowing = true then
  begin
    DesignDlg.close;
  end;
end;

(* ********************************************************************* *)
{ TPressureFrm.FormClose }
procedure TPressureFrm.FormClose(Sender: TObject;
  var Action: TCloseAction);
begin
  Release;
end;

(* ********************************************************************* *)
{ TPressureFrm.BN_PrintClick }
procedure TPressureFrm.BN_PrintClick(Sender: TObject);
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
  Stream := tResourceStream.create(hinstance, 'Pressure', RT_RCDATA);
  strstream := tStringStream.create();

  try
    strstream.LoadFromStream(Stream);
    htmlText := strstream.DataString;
  finally
    strstream.Free();
    Stream.Free();
  end;
  htmlText := StringReplace(htmlText, '$af2', ST_PressureUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$dt2', ST_ThicknessUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$dd2', ST_RadiusUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$me2', ST_ModulusUnit.caption,
    [rfReplaceAll, rfIgnoreCase]);

  htmlText := StringReplace(htmlText, '$af1', EB_AppliedPressure.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$dt1', EB_Thickness.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$dd1', EB_Diameter.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$pr1', EB_Poisson.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$me1', EB_Modulus.text,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$rs1', ST_Radial.caption,
    [rfReplaceAll, rfIgnoreCase]);
  htmlText := StringReplace(htmlText, '$ts1', ST_Tangential.caption,
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
  (* SSClearRange(Sheet1.SS, 4, 5, 14, 5, 3);
    {placing Units on sheet}
    SSSetActiveCell(Sheet1.SS, 4, 6);
    Sheet1.text := ST_PressureUnit.caption;
    SSSetActiveCell(Sheet1.SS, 6, 6);
    Sheet1.text := ST_ThicknessUnit.caption;
    SSSetActiveCell(Sheet1.SS, 7, 6);
    Sheet1.text := ST_RadiusUnit.caption;
    SSSetActiveCell(Sheet1.SS, 10, 6);
    Sheet1.text := ST_ModulusUnit.caption;
    SSSetActiveCell(Sheet1.SS, 4, 5);
    Sheet1.text := EB_AppliedPressure.text;
    SSSetActiveCell(Sheet1.SS, 6, 5);
    Sheet1.text := EB_Thickness.text;
    SSSetActiveCell(Sheet1.SS, 7, 5);
    Sheet1.text := EB_Diameter.text;
    SSSetActiveCell(Sheet1.SS, 9, 5);
    Sheet1.text := EB_Poisson.text;
    SSSetActiveCell(Sheet1.SS, 10, 5);
    Sheet1.text := EB_Modulus.text;
    SSSetActiveCell(Sheet1.SS, 13, 5);
    Sheet1.text := ST_Radial.caption;
    SSSetActiveCell(Sheet1.SS, 14, 5);
    Sheet1.text := ST_Tangential.caption;
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
{ TPressureFrm.BN_HelpClick }
procedure TPressureFrm.BN_helpClick(Sender: TObject);
begin
  Application.HelpContext(1150);
end;

begin
  { ...registering object }
  RegisterClasses([TPressure]);

end.
