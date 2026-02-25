(***********************************************)
(*  Ring Bending Beam Unit                     *)
(***********************************************)
unit Ringbb;

interface

uses
  SysUtils, WinTypes, WinProcs, Messages, Classes, Graphics, Controls,
  StdCtrls, ExtCtrls, Forms, Buttons, acStream, acList, Log, LogItem, LogStrm;

const
  MAXTEXTLENGTH   = 40;
  MAXERRORLENGTH  = 80;

type
  RealType = double;

(***********************************************)
(*  Ring Bending Beam Object                   *)
(***********************************************)
type TRingBendingBeam = class(TLogItem)
private
  FAppliedLoad      : RealType;
  FRingWidth        : RealType;
  FInsideDiameter   : RealType;
  FOutsideDiameter  : RealType;
  FModulus          : RealType;
  FGageLength       : RealType;
  FGageFactor       : RealType;
  FAvgStrainAD      : string;
  FAvgStrainBC      : string;
  FFullSpan         : string;
  TheString         : string;
protected
  procedure AssignTo(Dest: TPersistent); override;
  procedure InitFields; override;
  procedure SaveToStream(Stream: TacObjStream); override;
  procedure ReadFromStream(Stream: TacObjStream); override;
  procedure ShowTheForm; override;
  function GetAsString: String; override;
public
  constructor create;
  property AppliedLoad: RealType read FAppliedLoad write FAppliedLoad;
  property RingWidth: RealType read FRingWidth write FRingWidth;
  property InsideDiameter: RealType read FInsideDiameter write FInsideDiameter;
  property OutsideDiameter: RealType read FOutsideDiameter write FOutsideDiameter;
  property Modulus: RealType read FModulus write FModulus;
  property GageLength: RealType read FGageLength write FGageLength;
  property GageFactor: RealType read FGageFactor write FGageFactor;
  property AvgStrainAD: string read FAvgStrainAD write FAvgStrainAD;
  property AvgStrainBC: string read FAvgStrainBC write FAvgStrainBC;
  property FullSpan: string read FFullSpan write FFullSpan;
  property TheStringText: string read TheString write TheString;
end;

(***********************************************)
(*  Ring Bending Beam Form Object              *)
(***********************************************)
type
  TRingBBFrm = class(TForm)
    BN_OK: TBitBtn;
    BN_Cancel: TBitBtn;
    Panel1: TPanel;
    GroupBox1: TGroupBox;
    EB_AppliedLoad: TEdit;
    GroupBox2: TGroupBox;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    EB_RingWidth: TEdit;
    EB_InsideDiameter: TEdit;
    EB_OutsideDiameter: TEdit;
    GroupBox3: TGroupBox;
    EB_Modulus: TEdit;
    GroupBox4: TGroupBox;
    EB_GageLength: TEdit;
    ST_LoadUnit: TLabel;
    ST_WidthUnit: TLabel;
    ST_InsideDiameterUnit: TLabel;
    ST_OutsideDiameterUnit: TLabel;
    ST_ModulusUnit: TLabel;
    ST_LengthUnit: TLabel;
    Panel2: TPanel;
    GroupBox5: TGroupBox;
    Label6: TLabel;
    ST_AverageAD: TLabel;
    Label20: TLabel;
    Panel3: TPanel;
    Image1: TImage;
    Label7: TLabel;
    Label8: TLabel;
    Label12: TLabel;
    ST_AverageBC: TLabel;
    Label13: TLabel;
    Label14: TLabel;
    Label15: TLabel;
    ST_FullSpan: TLabel;
    Label17: TLabel;
    EB_GageFactor: TEdit;
    BN_Compute: TBitBtn;
    Label4: TLabel;
    procedure FormCreate(Sender: TObject);
    procedure BN_ComputeClick(Sender: TObject);
    procedure BN_CancelClick(Sender: TObject);
    procedure FormActivate(Sender: TObject);
    procedure BN_OKClick(Sender: TObject);
    function Avg_StrainAD: RealType;
    function Avg_StrainBC: RealType;
    function FullBridgeSensitivity: RealType;
  private
    Old_AppliedLoad     : string;
    Old_RingWidth       : string;
    Old_InsideDiameter  : string;
    Old_OutsideDiameter : string;
    Old_Modulus         : string;
    Old_GageLength      : string;
    Old_GageFactor      : string;
    Old_AvgStrainAD     : string;
    Old_AvgStrainBC     : string;
    Old_FullSpan        : string;
    AvgStrainTextAD     : string;
    AvgStrainTextBC     : string;
    SensitiveText       : string;
    ExceptionRaised     : boolean;
    Load                : RealType;
    Width               : RealType;
    Inside              : RealType;
    Outside             : RealType;
    Elasticity          : RealType;
    Length              : RealType;
    Factor              : RealType;
    EAvgAD              : RealType;
    EAvgBC              : RealType;
    FullSensitivity     : RealType;
  public
    RingBendingObject: TRingBendingBeam;
    RingBBeamChosen: boolean;
  end;

var
  RingBBFrm: TRingBBFrm;

implementation
uses MainMenu, Convert;
{$R *.DFM}

(***********************************************)
(*  RingBendingBeam Object Methods             *)
(***********************************************)

(***********************************************************************)
{ TRingBendingBeam.create}
constructor TRingBendingBeam.create;
begin
  {...creating object}
  inherited create;
  {...associating string with object}
  TheString := 'Ring Bending Beam';
end;

(***********************************************************************)
{ TRingBendingBeam.GetAsString}
function TRingBendingBeam.GetAsString: string;
begin
  Result := TheString;
end;

(***********************************************************************)
{TRingBendingBeam.ShowTheForm}
procedure TRingBendingBeam.ShowTheForm;
begin
  RingBBFrm.show;
end;

(***********************************************************************)
{ TRingBendingBeam.AssignTo}
procedure TRingBendingBeam.AssignTo(Dest: TPersistent);
begin
  if (Dest is TRingBendingBeam) and (Self is Dest.ClassType) then begin
    inherited AssignTo(TLogItem(Dest));
    with Dest as TRingBendingBeam do begin
      FAppliedLoad := self.FAppliedLoad;
      FRingWidth := self.FRingWidth;
      FInsideDiameter := self.FInsideDiameter;
      FOutsideDiameter := self.FOutsideDiameter;
      FModulus := self.FModulus;
      FGageLength := self.FGageLength;
      FGageFactor := self.GageFactor;
      FAvgStrainAD := self.FAvgStrainAD;
      FAvgStrainBC := self.FAvgStrainBC;
      FFullSpan := self.FFullSpan;
    end;
  end
  else begin
    inherited AssignTo(Dest);
  end;
end;

(***********************************************************************)
{ TRingBendingBeam.InitFields}
procedure TRingBendingBeam.InitFields;
begin
  inherited InitFields;
end;

(***********************************************************************)
{ TRingBendingBeam.SaveToStream}
procedure TRingBendingBeam.SaveToStream(Stream: TacObjStream);
begin
  inherited SaveToStream(Stream);
  Stream.SaveBuffer(FAppliedLoad, sizeof(RealType));
  Stream.SaveBuffer(FRingWidth, sizeof(RealType));
  Stream.SaveBuffer(FInsideDiameter, sizeof(RealType));
  Stream.SaveBuffer(FOutsideDiameter, sizeof(RealType));
  Stream.SaveBuffer(FModulus, sizeof(RealType));
  Stream.SaveBuffer(FGageLength, sizeof(RealType));
  Stream.SaveBuffer(FGageFactor, sizeof(RealType));
  Stream.SaveBuffer(FAvgStrainAD, sizeof(string));
  Stream.SaveBuffer(FAvgStrainBC, sizeof(string));
  Stream.SaveBuffer(FFullSpan, sizeof(string));
end;

(***********************************************************************)
{ TRingBendingBeam.ReadFromStream}
procedure TRingBendingBeam.ReadFromStream(Stream: TacObjStream);
begin
  inherited ReadFromStream(Stream);
  Stream.ReadBuffer(FAppliedLoad, sizeof(RealType));
  Stream.ReadBuffer(FRingWidth, sizeof(RealType));
  Stream.ReadBuffer(FInsideDiameter, sizeof(RealType));
  Stream.ReadBuffer(FOutsideDiameter, sizeof(RealType));
  Stream.ReadBuffer(FModulus, sizeof(RealType));
  Stream.ReadBuffer(FGageLength, sizeof(RealType));
  Stream.ReadBuffer(FGageFactor, sizeof(RealType));
  Stream.ReadBuffer(FAvgStrainAD, sizeof(string));
  Stream.ReadBuffer(FAvgStrainBC, sizeof(string));
  Stream.ReadBuffer(FFullSpan, sizeof(string));
end;


(***********************************************)
(*  Ring Bending Beam Form Methods             *)
(***********************************************)

(***********************************************************************)
{TRingBBFrm.Avg_StrainAD}
function TRingBBFrm.Avg_StrainAD: RealType;
var
  ErrorMsg              : array[0..MAXTEXTLENGTH-1] of char;
  ErrorCaption          : array[0..MAXTEXTLENGTH-1] of char;
  FirstTerm             : RealType;
  SecondTerm            : RealType;
  SecondTermNumerator   : RealType;
  SecondTermDenominator : RealType;
  RatioNumerator        : RealType;
  RatioDenominator      : RealType;
  AreaNumber            : RealType;
  RatioResult           : RealType;
  StrainResult          : RealType;
  Thickness             : RealType;
  Button                : integer;
begin
  ExceptionRaised := false;
  Thickness := (Outside - Inside)/2;
  AreaNumber := Width * Thickness;
  RatioNumerator := Thickness;
  RatioDenominator := (Inside/2) + (Thickness/2);
  {...calculating ratio of inside vs outside}
  try
    RatioResult := RatioNumerator/RatioDenominator;
  except
    {TODO:  need better message}
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoAvgStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  {...calculating average strain}
  FirstTerm := (Load/(Elasticity* AreaNumber));
  SecondTermNumerator := (0.300 * (6 + RatioResult));
  SecondTermDenominator :=  (RatioResult* (2 + RatioResult));
  {TODO ....try statement next line}
  SecondTerm := (SecondTermNumerator/SecondTermDenominator) - 0.5;
  try
    StrainResult := ((FirstTerm * SecondTerm) * 1e6);
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoAvgStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  Avg_StrainAD := StrainResult;
end;

(***********************************************************************)
{TRingBBFrm.Avg_StrainBC}
function TRingBBFrm.Avg_StrainBC: RealType;
var
  ErrorMsg              : array[0..MAXTEXTLENGTH-1] of char;
  ErrorCaption          : array[0..MAXTEXTLENGTH-1] of char;
  FirstTerm             : RealType;
  SecondTerm            : RealType;
  SecondTermNumerator   : RealType;
  SecondTermDenominator : RealType;
  RatioNumerator        : RealType;
  RatioDenominator      : RealType;
  AreaNumber            : RealType;
  RatioResult           : RealType;
  StrainResult          : RealType;
  Thickness             : RealType;
  Button                : integer;
begin
  ExceptionRaised := false;
  Thickness := (Outside - Inside)/2;
  AreaNumber := Width * Thickness;
  RatioNumerator := Thickness;
  RatioDenominator := (Inside/2) + (Thickness/2);
  {...calculating ratio of inside vs outside}
  try
    RatioResult := RatioNumerator/RatioDenominator;
  except
    {TODO:  need better message}
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoAvgStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  {...calculating average strain}
  FirstTerm := (Load/(Elasticity * AreaNumber));
  SecondTermNumerator := (0.324 * (6 - RatioResult));
  SecondTermDenominator :=  (RatioResult* (2 - RatioResult));
  {TODO ....try statement next line}
  SecondTerm := (SecondTermNumerator/SecondTermDenominator) + 0.5;
  try
    StrainResult := -((FirstTerm * SecondTerm) * 1e6);
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoAvgStrain, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  Avg_StrainBC := StrainResult;
end;

(***********************************************************************)
{TRingBBFrm.FullBridgeSensitivity}
function TRingBBFrm.FullBridgeSensitivity: RealType;
var
  ErrorMsg       : array[0..MAXTEXTLENGTH-1] of char;
  ErrorCaption   : array[0..MAXTEXTLENGTH-1] of char;
  Answer         : RealType;
  SpanResult     : RealType;
  Button         : integer;
begin
  SpanResult := 0;
  ExceptionRaised := false;
  try
    SpanResult := (((2 * EAvgAD) - (2 * EAvgBC))/4) * Factor * 1e-3;
  except
    on EMathError do begin
      LoadString(hinstance, ID_SZ_NoFullSpan, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ExceptionRaised := true;
    end;
  end;
  FullBridgeSensitivity := SpanResult;
end;

(***********************************************************************)
{TRingBBFrm.FormCreate}
procedure TRingBBFrm.FormCreate(Sender: TObject);
var
  LoadUnit      : array[0..MAXTEXTLENGTH-1] of char;
  DimensionUnit : array[0..MAXTEXTLENGTH-1] of char;
  ModulusUnit   : array[0..MAXTEXTLENGTH-1] of char;
begin
  {...deciding whether to use Std. or SI units for form units}
  if MainForm.UnitsAreUS = true then begin
    LoadString(hinstance, ID_SZ_USLBF, LoadUnit, sizeof(LoadUnit));
    LoadString(hinstance, ID_SZ_Inches, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_PSI, ModulusUnit, sizeof(ModulusUnit));
  end
  else begin
    LoadString(hinstance, ID_SZ_MetricKG, LoadUnit, sizeof(LoadUnit));
    LoadString(hinstance, ID_SZ_MM, DimensionUnit, sizeof(DimensionUnit));
    LoadString(hinstance, ID_SZ_GPa, ModulusUnit, sizeof(ModulusUnit));
  end;
  {...placing form units on form}
  ST_LoadUnit.caption := LoadUnit;
  ST_WidthUnit.caption := DimensionUnit;
  ST_InsideDiameterUnit.caption := DimensionUnit;
  ST_OutsideDiameterUnit.caption := DimensionUnit;
  ST_ModulusUnit.caption := ModulusUnit;
  ST_LengthUnit.caption := DimensionUnit;
end;


(***********************************************************************)
{TRingBBFrm.BN_ComputeClick}
procedure TRingBBFrm.BN_ComputeClick(Sender: TObject);
const
  MINAPPLIEDLOAD_US      = 0.0000;
  MAXAPPLIEDLOAD_US      = 10000;
  MINRINGWIDTH_US        = 0.001;
  MAXRINGWIDTH_US        = 1000;
  MININSIDEDIAMETER_US   = 0.0001;
  MAXINSIDEDIAMETER_US   = 1000;
  MINOUTSIDEDIAMETER_US  = 0.001;
  MAXOUTSIDEDIAMETER_US  = 10000;
  MINMODULUS_US          = 100;
  MAXMODULUS_US          = 100e6;
  MINGAGELENGTH_US       = 0.001;
  MAXGAGELENGTH_US       = 4.0;
  MINGAGEFACTOR_US       = 1.0;
  MAXGAGEFACTOR_US       = 5.0;
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
  IsThereAnError : boolean;
  MinAppliedLoad : RealType;
  MaxAppliedLoad : RealType;
  MinRingWidth   : RealType;
  MaxRingWidth   : RealType;
  MinInside      : RealType;
  MaxInside      : RealType;
  MinOutside     : RealType;
  MaxOutside     : RealType;
  MinModulus     : RealType;
  MaxModulus     : RealType;
  MinGageLength  : RealType;
  MaxGageLength  : RealType;
  MinGageFactor  : RealType;
  MaxGageFactor  : RealType;
  ErrorCode      : integer;
  Button         : integer;
begin
  {...Determining which units to use std. or si for min and max value for error checking}
  if MainForm.UnitsAreUS = True then begin
    MinAppliedLoad := MINAPPLIEDLOAD_US;
    MaxAppliedLoad := MAXAPPLIEDLOAD_US;
    MinRingWidth   := MINRINGWIDTH_US;
    MaxRingWidth   := MAXRINGWIDTH_US;
    MinInside      := MININSIDEDIAMETER_US;
    MaxInside      := MAXINSIDEDIAMETER_US;
    MinOutside     := MINOUTSIDEDIAMETER_US;
    MaxOutside     := MAXOUTSIDEDIAMETER_US;
    MinModulus     := MINMODULUS_US;
    MaxModulus     := MAXMODULUS_US;
    MinGageLength  := MINGAGELENGTH_US;
    MaxGageLength  := MAXGAGELENGTH_US;
    MinGageFactor  := MINGAGEFACTOR_US;
    MaxGageFactor  := MAXGAGEFACTOR_US;
  end
  else begin
    MinAppliedLoad := Lbs_To_Kg(MINAPPLIEDLOAD_US);
    MaxAppliedLoad := Lbs_To_Kg(MAXAPPLIEDLOAD_US);
    MinRingWidth   := Inches_To_mm(MINRINGWIDTH_US);
    MaxRingWidth   := Inches_To_mm(MAXRINGWIDTH_US);
    MinInside      := Inches_To_mm(MININSIDEDIAMETER_US);
    MaxInside      := Inches_To_mm(MAXINSIDEDIAMETER_US);
    MinOutside     := Inches_To_mm(MINOUTSIDEDIAMETER_US);
    MaxOutside     := Inches_To_mm(MAXOUTSIDEDIAMETER_US);
    MinModulus     := PSI_To_GPa(MINMODULUS_US);
    MaxModulus     := PSI_To_GPa(MAXMODULUS_US);
    MinGageLength  := Inches_To_mm(MINGAGELENGTH_US);
    MaxGageLength  := Inches_To_mm(MAXGAGELENGTH_US);
    MinGageFactor  := MINGAGEFACTOR_US;
    MaxGageFactor  := MAXGAGEFACTOR_US;
  end;
  {...checking Applied Load to see if valid}
  IsThereAnError := False;
  EditStrings := EB_AppliedLoad.text;
  val(EditStrings, load, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedLoad.setfocus;
    EB_AppliedLoad.clearselection;
    exit;
  end
  else if (Load < MinAppliedLoad) or (Load > MaxAppliedLoad) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_USlbf, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_MetricKG, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_AppliedLoad, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinAppliedLoad);
    StrMax := floattostr(MaxAppliedLoad);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_AppliedLoad.setfocus;
    EB_AppliedLoad.clearselection;
    exit;
  end;
  {..checking Ring Width to see if valid}
  EditStrings := EB_RingWidth.text;
  val(EditStrings, Width, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_RingWidth.setfocus;
    EB_RingWidth.clearselection;
    exit;
  end
  else if (Width < MinRingWidth) or (Width > MaxRingWidth) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_RingWidth, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinRingWidth);
    StrMax := floattostr(MaxRingWidth);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_RingWidth.setfocus;
    EB_RingWidth.clearselection;
    exit;
  end;
  {...checking to see if Inside Diameter is valid}
  EditStrings := EB_InsideDiameter.text;
  val(EditStrings, Inside, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_InsideDiameter.setfocus;
    EB_InsideDiameter.clearselection;
    exit;
  end
  else if (Inside < MinInside) or (Inside > MaxInside) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_InsideDiameter, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinInside);
    StrMax := floattostr(MaxInside);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_InsideDiameter.setfocus;
    EB_InsideDiameter.clearselection;
    exit;
  end;
  {...checking to see if Outside Diameter is valid}
  EditStrings := EB_OutsideDiameter.text;
  val(EditStrings, Outside, ErrorCode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_OutsideDiameter.setfocus;
    EB_OutsideDiameter.clearselection;
    exit;
  end
  else if (Outside < MinOutside) or (Outside > MaxOutside) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_OutsideDiameter, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinOutside);
    StrMax := floattostr(MaxOutside);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_OutsideDiameter.setfocus;
    EB_OutsideDiameter.clearselection;
    exit;
  end;
  {...checking to see if Modulus is valid}
  EditStrings := EB_Modulus.text;
  val(EditStrings, elasticity, errorcode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Modulus.setfocus;
    EB_Modulus.clearselection;
    exit;
  end
  else if (elasticity < MinModulus) or (elasticity > MaxModulus) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_PSI, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_GPA, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_Modulus, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinModulus);
    StrMax := floattostr(MaxModulus);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_Modulus.setfocus;
    EB_Modulus.clearselection;
    exit;
  end;
  {...checking to see if Gage Length is valid}
  EditStrings := EB_GageLength.text;
  val(EditStrings, length, errorcode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageLength.setfocus;
    EB_GageLength.clearselection;
    exit;
  end
  else if (length < MinGageLength) or (length > MaxGageLength) then begin
    IsThereAnError := True;
    if MainForm.UnitsAreUS = True then begin
      LoadString(hinstance, ID_SZ_Inches, ErrorUnit, sizeof(ErrorMsg));
    end
    else begin
      LoadString(hinstance, ID_SZ_MM, ErrorUnit, sizeof(ErrorMsg));
    end;
    LoadString(hinstance, ID_SZ_GageLength, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinGageLength);
    StrMax := floattostr(MaxGageLength);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax + ' ' + StrUnit;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageLength.setfocus;
    EB_GageLength.clearselection;
    exit;
  end;
  {...checking to see if Gage Factor is valid}
  EditStrings := EB_GageFactor.text;
  val(EditStrings, factor, errorcode);
  if ErrorCode <> 0 then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_NotValidNo, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end
  else if (factor < MinGageFactor) or (Factor > MaxGageFactor) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_GageFactor, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_And, ErrorAnd, sizeof(ErrorMsg));
    StrMsg := strpas(ErrorMsg);
    StrUnit := strpas(ErrorUnit);
    StrAnd := strpas(ErrorAnd);
    StrMin := floattostr(MinGageFactor);
    StrMax := floattostr(MaxGageFactor);
    EditStrings := StrMsg + ' ' + StrMin + ' ' + StrAnd + ' ' + StrMax;
    StrPCopy(ErrorMsg, EditStrings);
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageFactor.setfocus;
    EB_GageFactor.clearselection;
    exit;
  end;
 {...checking to make sure inside diameter is not greater than outside diameter}
  if Inside >= Outside then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_InsideTooBig, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_InsideDiameter.setfocus;
    EB_InsideDiameter.clearselection;
    exit;
  end;
 {...checking to make sure Gage length > 0.3 * Outside Diameter}
  if Length > (0.3 * Outside) then begin
    IsThereAnError := True;
    LoadString(hinstance, ID_SZ_GageLengthTooBig, ErrorMsg, sizeof(ErrorMsg));
    LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
    Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
    ModalResult := 0;
    EB_GageLength.setfocus;
    EB_GageLength.clearselection;
    exit;
  end;
  {...doing calculations}
  if IsThereAnError = False then begin
    {...Average StrainAD}
    EAvgAD := Avg_StrainAD;
    if abs(EAvgAD) < 5000 then begin
      if ExceptionRaised = false then begin
        AvgStrainTextAD := floattostrf(EAvgAD, ffFixed, 4, 0);
        ST_AverageAD.caption := AvgStrainTextAD;
      end;
    end
    else begin
      LoadString(hinstance, ID_SZ_Impratical, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ST_AverageAD.caption := '';
      ST_AverageBC.caption := '';
      ST_FullSpan.caption := '';
      ModalResult := 0;
      exit;
    end;
    {...Average StrainBC}
    EAvgBC := Avg_StrainBC;
    if abs(EAvgAD) < 5000 then begin
      if ExceptionRaised = false then begin
        AvgStrainTextBC := floattostrf(EAvgBC, ffFixed, 4, 0);
        ST_AverageBC.caption := AvgStrainTextBC;
      end;
    end
    else begin
      LoadString(hinstance, ID_SZ_Impratical, ErrorMsg, sizeof(ErrorMsg));
      LoadString(hinstance, ID_SZ_ErrorMsg, ErrorCaption, sizeof(ErrorCaption));
      Button := Application.MessageBox(ErrorMsg, ErrorCaption, mb_OK or mb_IconExclamation);
      ST_AverageAD.caption := '';
      ST_AverageBC.caption := '';
      ST_FullSpan.caption := '';
      ModalResult := 0;
      exit;
    end;
    {...Full Bridge Sensitivity}
    FullSensitivity := FullBridgeSensitivity;
    if ExceptionRaised = false then begin
      SensitiveText := floattostrf(FullSensitivity, ffFixed, 4, 3);
      ST_FullSpan.caption := SensitiveText;
    end;
  end;
end;

(***********************************************************************)
{TRingBBFrm.BN_CancelClick}
procedure TRingBBFrm.BN_CancelClick(Sender: TObject);
begin
  {...placing initial values in edit box because cancel was clicked}
  EB_AppliedLoad.text := Old_AppliedLoad;
  EB_RingWidth.text := Old_RingWidth;
  EB_InsideDiameter.text := Old_InsideDiameter;
  EB_OutsideDiameter.text := Old_OutsideDiameter;
  EB_Modulus.text := Old_Modulus;
  EB_GageLength.text := Old_GageLength;
  EB_GageFactor.text := Old_GageFactor;
  ST_AverageAD.caption := Old_AvgStrainAD;
  ST_AverageBC.caption := Old_AvgStrainBC;
  ST_FullSpan.caption := Old_FullSpan;
  if RingBBeamChosen = false then begin
    RingBBeamChosen := false;
    MainForm.Design1.enabled := true;
  end;
  close;
end;

(***********************************************************************)
{TRingBBFrm.FormActivate}
procedure TRingBBFrm.FormActivate(Sender: TObject);
var
  EditStrings  : string;
  i            : integer;
  TheItem      : TacStreamable;
begin
  {getting item from object if there is one}
  TheItem := nil;
  i := 0;
  Repeat
    if MainForm.FLog.AtIndex(i) is TRingBendingBeam then begin
      TheItem := MainForm.FLog.AtIndex(i);
    end;
    inc(i);
  until (TheItem <> nil) or (i > MainForm.Flog.Count);
  {...if there is an object, placing in edit boxes}
  if TheItem <> nil then begin
    Load := (TheItem as TRingBendingBeam).AppliedLoad;
    str(Load:4:4, EditStrings);
    EB_AppliedLoad.text := EditStrings;
    Width := (TheItem as TRingBendingBeam).RingWidth;
    str(Width:4:4, EditStrings);
    EB_RingWidth.text := EditStrings;
    Inside := (TheItem as TRingBendingBeam).InsideDiameter;
    str(Inside:4:4, EditStrings);
    EB_InsideDiameter.text := EditStrings;
    Outside := (TheItem as TRingBendingBeam).OutsideDiameter;
    str(Outside:4:4, EditStrings);
    EB_OutsideDiameter.text := EditStrings;
    Elasticity := (TheItem as TRingBendingBeam).Modulus;
    str(Elasticity:4:4, EditStrings);
    EB_Modulus.text := EditStrings;
    Length := (TheItem as TRingBendingBeam).GageLength;
    str(Length:4:4, EditStrings);
    EB_GageLength.text := EditStrings;
    Factor := (TheItem as TRingBendingBeam).GageFactor;
    str(Factor:4:4, EditStrings);
    EB_GageFactor.text := EditStrings;
    AvgStrainTextAD := (TheItem as TRingBendingBeam).AvgStrainAD;
    ST_AverageAD.caption := AvgStrainTextAD;
    AvgStrainTextBC := (TheItem as TRingBendingBeam).AvgStrainBC;
    ST_AverageBC.caption := AvgStrainTextBC;
    SensitiveText := (TheItem as TRingBendingBeam).FullSpan;
    ST_FullSpan.caption := SensitiveText;
 end;
  {...placing initial value in old variables in case cancel clicked}
  Old_AppliedLoad := EB_AppliedLoad.text;
  Old_RingWidth := EB_RingWidth.text;
  Old_InsideDiameter := EB_InsideDiameter.text;
  Old_OutsideDiameter := EB_OutsideDiameter.text;
  Old_Modulus := EB_Modulus.text;
  Old_GageLength := EB_GageLength.text;
  Old_GageFactor := EB_GageFactor.text;
  Old_AvgStrainAD := ST_AverageAD.caption;
  Old_AvgStrainBC := ST_AverageBC.caption;
  Old_FullSpan := ST_FullSpan.caption;
  EB_AppliedLoad.setfocus;
end;

(***********************************************************************)
{TRingBBFrm.BN_OKClick}
procedure TRingBBFrm.BN_OKClick(Sender: TObject);
var
  i : integer;
begin
  BN_ComputeClick(Sender);
  RingBBeamChosen := true;
 { MainForm.DesignChosen := true;}
  MainForm.Design1.enabled := false;
  {...creating and placing values in object}
  RingBendingObject := TRingBendingBeam.create;
  RingBendingObject.AppliedLoad := load;
  RingBendingObject.RingWidth := Width;
  RingBendingObject.InsideDiameter := Inside;
  RingBendingObject.OutsideDiameter := Outside;
  RingBendingObject.Modulus := Elasticity;
  RingBendingObject.GageLength := Length;
  RingBendingObject.GageFactor := Factor;
  RingBendingObject.AvgStrainAD := AvgStrainTextAD;
  RingBendingObject.AvgStrainBC := AvgStrainTextBC;
  RingBendingObject.FullSpan := SensitiveText;
  MainForm.AddToLog(RingBendingObject);
  {...placing string associated with object in the outline}
  i := 0;
   repeat
    inc(i);
  until (MainForm.XCalcOutline.Items[i].text = 'Design') or (i > MainForm.XCalcOutline.ItemCount);
  MainForm.XCalcOutline.AddChild(i, RingBendingObject.GetAsString);
  close;
end;

begin
  {...registering the object}
  RegisterClasses([TRingBendingBeam]);
end.




