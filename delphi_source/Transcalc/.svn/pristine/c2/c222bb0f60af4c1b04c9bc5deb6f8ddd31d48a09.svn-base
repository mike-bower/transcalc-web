unit acStream;

{
  Project: Non-Component Persistent Object Streaming

  Alan Ciemian
  Copyright © 1995. All Rights Reserved


  Overview
  ========
  Implements basic classes for persistent object streaming.

  TacStreamable defines the interface for streamable objects.
  TacObjStream  defines the interface for object capable streams.

  TacFileObjStream implements a file based object stream.
  TacMemoryObjStream implements a memory based object stream.
}

interface

uses
  Classes, SysUtils, System.Types;

type
  TacStreamableClassName = string[63];
  { Only 63 chars of identifiers are significant }
  TacStreamableClassId = Int16; { Identifies class of streamed objects }
  TacStreamableClassIdx = Int16; { Index into class list }

type
  TacObjStreamMode =
    (
    osmClosed, { stream not open }
    osmInput, { for reading only }
    osmOutput, { for writing only, starts with empty stream }
    osmAppend { for writing only, starts with current contents }
    );
  TacObjStreamModes = set of TacObjStreamMode;

type { Standard stream header. Starts every TacObjStream. }
  TacObjStreamHeader = record
    Signature: array [0 .. 7] of AnsiChar;
    Version: LongInt;
    ClassTableOffset: LongInt;
  end;

const
  DefaultObjStreamHeader: TacObjStreamHeader =
    (
    Signature: 'ACSTREAM';
    Version: $00000000;
    ClassTableOffset: $00000000
    );

type { TacObjStream exception classes }
  EacObjStream = class(Exception)
    { Base class for TacObjStream Exceptions }
  end;

  EacObjStreamInvalid = class(EacObjStream)
    { Unexpected stream format, header unrecognized }
  end;

  EacObjStreamWrongMode = class(EacObjStream)
    { Stream is in the wrong mode for requested operation }
  end;

type
  TacObjStream = class; { Forward }

  TacStreamableClass = class of TacStreamable;

  TacStreamable = class(TPersistent)
  protected
    { Centralized field initialization }
    procedure InitFields; virtual;
    { Stream interface }
    constructor CreateFromStream(Stream: TacObjStream);
    procedure SaveToStream(Stream: TacObjStream); virtual; abstract;
    procedure ReadFromStream(Stream: TacObjStream); virtual; abstract;
    { Property methods }
    function GetAsString: String; virtual;
  public
    { Constructors }
    constructor Create;
    constructor CreateClone(const Other: TacStreamable);
    { Properties }
    property AsString: String
      read GetAsString;
    { new mjb }
    procedure ShowTheForm; virtual; abstract;
    { new pjp }
    procedure PrintTheForm; virtual; abstract;
  end;

  TacObjStream = class(TObject)
  private
    FMode: TacObjStreamMode; { Access mode }
    FHeader: TacObjStreamHeader; { Stream header }
    FClassTable: TStringList; { In-memory class lookup table }
    { Stream header management }
    procedure SaveStreamHeader;
    procedure ReadStreamHeader;
    { Class table management }
    procedure PrepareClassTable(const Mode: TacObjStreamMode);
    procedure SaveClassTable;
    procedure ReadClassTable;
    function AddClassRef(const Obj: TacStreamable): TacStreamableClassId;
  protected
    { Abstract internal stream interface }
    function GetStream: TStream; virtual; abstract;
    procedure OpenStream(const Mode: TacObjStreamMode); virtual; abstract;
    procedure CloseStream; virtual; abstract;
    { Error handling }
    procedure ValidateStreamMode(const Modes: TacObjStreamModes);
    procedure ObjStreamError(Exc: Exception); virtual;
    { Placeholders for user added headers }
    procedure SaveHeader; virtual;
    procedure ReadHeader; virtual;
    procedure SaveInt16(value: Int16);
    function ReadInt16: Int16;
  public
    { Construction/Destruction }
    constructor Create;
    destructor Destroy; override;
    { Opening and closing stream }
    procedure OpenForInput;
    procedure OpenForOutput;
    procedure OpenForAppend;
    procedure Close;
    { Save and Read methods for streaming objects }
    procedure SaveObject(const Obj: TacStreamable);
    function ReadObject(const Obj: TacStreamable): TacStreamable;
    { Methods used by objects to read/write their data }
    procedure SaveBuffer(const Buffer; Count: LongInt);
    procedure ReadBuffer(var Buffer; Count: LongInt);
    procedure SaveTRect(RectToSave: TRect);
    procedure ReadTRect(var RectToRestore: TRect);
    procedure SaveCStr(const CStr: PChar);
    function ReadCStr: PChar;
  end;

  TacFileObjStream = class(TacObjStream)
  private
    FFilename: TFilename;
    FFileStream: TFileStream;
  protected
    { Required internal stream interface }
    function GetStream: TStream; override;
    procedure OpenStream(const Mode: TacObjStreamMode); override;
    procedure CloseStream; override;
  public
    { Construction/Destruction }
    constructor Create(const Filename: TFilename);
    destructor Destroy; override;
    { Properties }
    property Filename: TFilename
      read FFilename;
  end;

  TacMemoryObjStream = class(TacObjStream)
  private
    FMemoryStream: TMemoryStream;
  protected
    { Required internal stream interface }
    function GetStream: TStream; override;
    procedure OpenStream(const Mode: TacObjStreamMode); override;
    procedure CloseStream; override;
  public
    { Construction/Destruction }
    constructor Create;
    destructor Destroy; override;
  end;

const { Simulating static class fiels }
  TacFileObjStream_BackupExt: string[4] = '.BAK';

implementation


{ TacStreamable implementation }

{
  Create creates a default instance.
}
constructor TacStreamable.Create;
begin
  inherited Create;
  InitFields;
end;

{
  CreateClone is a copy constructor. It creates an instance that
  duplicates another assignment compatible instance.
}
constructor TacStreamable.CreateClone
  (
  const Other: TacStreamable
  );
begin
  Create;
  Assign(Other);
end;

{
  CreateFromStream creates an instance from a stream.
}
constructor TacStreamable.CreateFromStream
  (
  Stream: TacObjStream
  );
begin
  Create;
  ReadFromStream(Stream);
end;

{
  InitFields allows derived classes to specify default values for
  its fields. Used by all the constructors directly or indirectly.
}
procedure TacStreamable.InitFields;
begin
end;

{
  GetAsString returns a string representation of the object. Optional
  but very useful for objects placed in lists.
}
function TacStreamable.GetAsString;
begin
  Result := '';
end;

{ TacObjStream implementation }

{
  Create initializes the ObjStream instance.
  At this point no actual stream has been opened.
}
constructor TacObjStream.Create;
begin
  inherited Create;
  FMode := osmClosed;
  FHeader := DefaultObjStreamHeader;
  FClassTable := TStringList.Create;
end;

{
  Destroy cleans up the ObjStream instance.
}
destructor TacObjStream.Destroy;
begin
  { Make sure actual stream is closed }
  if (FMode <> osmClosed) then
    Close;

  { Free the class table }
  FClassTable.Free;

  inherited Destroy;
end;

{
  ObjStreamError is a default exception processor. It just raises
  the passed exception. Subclasses can override to modify TacObjStream
  exceptions in one place instead of at each use.
}
procedure TacObjStream.ObjStreamError(Exc: Exception);
begin
  raise Exc;
end;

{
  ValidateStreamMode checks that the stream is in the expected mode.
  Raises exception if mode is unexpected.
}
procedure TacObjStream.ValidateStreamMode
  (
  const Modes: TacObjStreamModes
  );
begin
  if (not(FMode in Modes)) then
  begin
    ObjStreamError(EacObjStreamWrongMode.Create
      ('Operation is invalid for current stream mode.'));
  end;
end;

{
  SaveStreamHeader writes the stream header and then calls the virtual
  SaveHeader method to allow subclasses to save their own headers.
}
procedure TacObjStream.SaveStreamHeader;
begin
  with GetStream do
  begin
    { Seek to start of stream }
    Seek(0, soFromBeginning);
    { Save standard stream header }
    WriteBuffer(FHeader, SizeOf(FHeader));
  end;

  { Save user stream header }
  SaveHeader;
end;

procedure TacObjStream.SaveTRect(RectToSave: TRect);
begin
  SaveInt16(RectToSave.Left);
  SaveInt16(RectToSave.Top);
  SaveInt16(RectToSave.Right);
  SaveInt16(RectToSave.Bottom);
end;

{
  ReadStreamHeader reads and verifies the stream header and then calls the virtual
  ReadHeader method to allow subclasses to read their own headers.
}
procedure TacObjStream.ReadStreamHeader;
var
  test: integer;
begin
  with GetStream do
  begin
    { Seek to start of stream }
    Seek(0, soFromBeginning);
    { Read standard stream header }
    test := SizeOf(FHeader);
    ReadBuffer(FHeader, SizeOf(FHeader));
    { Validate standard stream header }
    if (FHeader.Signature <> DefaultObjStreamHeader.Signature) then
    begin
      ObjStreamError(EacObjStreamInvalid.Create('Invalid File'));
    end;

    { Read and validate user stream header }
    ReadHeader;
  end;
end;

procedure TacObjStream.ReadTRect(var RectToRestore: TRect);
begin
  RectToRestore.Left := ReadInt16();
  RectToRestore.Top := ReadInt16();
  RectToRestore.Right := ReadInt16();
  RectToRestore.Bottom := ReadInt16();
end;

{
  PrepareClassTable sets up the string list that is used for the class table.
}
procedure TacObjStream.PrepareClassTable
  (
  const Mode: TacObjStreamMode
  );
begin
  { Empty class table }
  FClassTable.Clear;

  case Mode of
    osmInput:
      begin { Need unsorted class table }
        FClassTable.Sorted := False;
      end;
    osmOutput,
      osmAppend:
      begin { Need sorted class table }
        FClassTable.Sorted := True;
        FClassTable.Duplicates := dupIgnore;
      end;
  end;
end;

{
  SaveClassTable appends the class table to the end of the stream.
  Should only be called for output streams.
}
procedure TacObjStream.SaveClassTable;
var
  EntryCnt: TacStreamableClassIdx;
  EntryIdx: TacStreamableClassIdx;
  ObjClassName: TacStreamableClassName;
  ObjClassId: TacStreamableClassId;
begin
  with GetStream do
  begin
    { Seek to end of file }
    Seek(0, soFromEnd);

    { Save class table offset in header }
    FHeader.ClassTableOffset := Position;

    { Write size of class table }
    EntryCnt := FClassTable.Count;
    WriteBuffer(EntryCnt, SizeOf(EntryCnt));
    { Write entries in form [class name][class id] }
    for EntryIdx := 0 to (EntryCnt - 1) do
    begin
      ObjClassName := ShortString(FClassTable.Strings[EntryIdx]);
      ObjClassId := TacStreamableClassId(FClassTable.Objects[EntryIdx]);
      WriteBuffer(ObjClassName, Length(ObjClassName) + 1);
      WriteBuffer(ObjClassId, SizeOf(ObjClassId));
    end;
  end;
end;

{
  ReadClassTable builds the class table from the stream.
  Called for osmInput and osmAppend streams.
  Stream offset of table is determined from stream header.
}
procedure TacObjStream.ReadClassTable;
var
  EntryCnt: TacStreamableClassIdx;
  EntryIdx: TacStreamableClassIdx;
  ObjClassName: TacStreamableClassName;
  ObjClassId: TacStreamableClassId;
begin
  with GetStream do
  begin
    { Position stream pointer to class table }
    Seek(FHeader.ClassTableOffset, soFromBeginning);

    { Read size of class table }
    ReadBuffer(EntryCnt, SizeOf(EntryCnt));

    if (FMode = osmInput) then
    begin { Expand list to proper size }
      for EntryIdx := 0 to (EntryCnt - 1) do
      begin
        FClassTable.Add('');
      end;
    end;

    { Read entries and update table }
    for EntryIdx := 0 to (EntryCnt - 1) do
    begin
      { Read in the class name and stream specific class id }
      ReadBuffer(ObjClassName[0], 1);
      ReadBuffer(ObjClassName[1], Ord(ObjClassName[0]));
      ReadBuffer(ObjClassId, SizeOf(ObjClassId));

      if (FMode = osmInput) then
      begin
        { Insert class names at index identified by class id }
        FClassTable.Strings[ObjClassId] := string(ObjClassName);
        { Lookup and save class type ref in associated object field }
        FClassTable.Objects[ObjClassId] :=
          TObject(FindClass(string(ObjClassName)));
      end
      else { FMode = osmAppend }
      begin
        { Insert class name, stuff class id in object ref }
        FClassTable.AddObject(string(ObjClassName), TObject(ObjClassId));
      end;
    end;
  end;
end;

{
  AddClassRef adds a new class type to the class table and returns the
  associated class id. If the class is already in the table just returns
  its class id. Class id is stored in the string list
  as the object reference.
}
function TacObjStream.AddClassRef
  (
  const Obj: TacStreamable
  ): TacStreamableClassId;
var
  ObjClassName: TacStreamableClassName;
  ObjClassIdx: TacStreamableClassIdx;
begin
  { Get the class name }
  ObjClassName := Obj.ClassName;
  { Look for class ref already in table }
  ObjClassIdx := FClassTable.IndexOf(string(ObjClassName));
  if (ObjClassIdx <> -1) then
  begin { Class in table, return class id }
    Result := TacStreamableClassId(FClassTable.Objects[ObjClassIdx]);
  end
  else
  begin { New Class, add class and return new class id }
    Result := FClassTable.Count;
    FClassTable.AddObject(string(ObjClassName), TObject(Result));
  end;
end;

{
  SaveHeader is a placeholder for subclasses to implement saving
  additional header info.
}
procedure TacObjStream.SaveHeader;
begin
end;

procedure TacObjStream.SaveInt16(value: Int16);
begin
  SaveBuffer(value, SizeOf(Int16));
end;

{
  ReadHeader is a placeholder for subclasses to implement reading
  additional header info.
}
procedure TacObjStream.ReadHeader;
begin
end;

function TacObjStream.ReadInt16: Int16;
VAR
  Temp: Int16;
begin
  ReadBuffer(Temp, SizeOf(Int16));
  Result := Temp;
end;

{
  OpenForInput
  Prepares and opens the stream for inputting.
}
procedure TacObjStream.OpenForInput;
var
  DataOffset: LongInt;
begin
  ValidateStreamMode([osmClosed]);

  { Setup class table }
  PrepareClassTable(osmInput);

  { Open up the actual stream }
  OpenStream(osmInput);
  FMode := osmInput;

  { Read Header }
  ReadStreamHeader;
  { Save position of start of data area }
  DataOffset := GetStream.Position;
  { Read Class Table }
  ReadClassTable;
  { Seek back to data area }
  GetStream.Seek(DataOffset, soFromBeginning);
end;

{
  OpenForOutput
  Prepares and opens the stream for outputting.
}
procedure TacObjStream.OpenForOutput;
begin
  ValidateStreamMode([osmClosed]);

  { Setup class table }
  PrepareClassTable(osmOutput);

  { Open up the actual stream }
  OpenStream(osmOutput);
  FMode := osmOutput;

  { Save a default stream header }
  SaveStreamHeader;
end;

{
  OpenForAppend
  Prepares and opens the stream for appending.
}
procedure TacObjStream.OpenForAppend;
var
  DataOffset: LongInt;
begin
  ValidateStreamMode([osmClosed]);

  { Setup class table }
  PrepareClassTable(osmAppend);

  { Open up the actual stream }
  OpenStream(osmAppend);

  { Mode starts as osmInput so subclasses can call Read methods for header }
  FMode := osmInput;

  { Read Header }
  ReadStreamHeader;
  { Save position where new data will start }
  DataOffset := FHeader.ClassTableOffset;

  { Now set real mode }
  FMode := osmAppend;

  { Read Class Table }
  ReadClassTable;
  { Seek back to data append position }
  GetStream.Seek(DataOffset, soFromBeginning);
end;

{
  Close
  Closes the stream.
}
procedure TacObjStream.Close;
begin
  ValidateStreamMode([osmInput, osmOutput, osmAppend]);
  case FMode of
    osmInput:
      begin { Nothing special to do }
      end;
    osmOutput,
      osmAppend:
      begin { Need to update class table and stream header }
        SaveClassTable;
        SaveStreamHeader;
      end;
  end;

  { Now close the actual stream }
  CloseStream;
  FMode := osmClosed;
end;

{
  SaveBuffer
  Main method for saving arbitrary data to the stream.
}
procedure TacObjStream.SaveBuffer(const Buffer; Count: LongInt);
begin
  ValidateStreamMode([osmOutput, osmAppend]);
  GetStream.WriteBuffer(Buffer, Count);
end;

{
  ReadBuffer
  Main method for reading arbitrary data to the stream.
}
procedure TacObjStream.ReadBuffer(var Buffer; Count: LongInt);
begin
  ValidateStreamMode([osmInput]);
  GetStream.ReadBuffer(Buffer, Count);
end;

{
  SaveObject
  Saves a TacStreamable object to the stream prefixed by its class Id.
  If Obj parameter is nil, nothing is saved.
}
procedure TacObjStream.SaveObject
  (
  const Obj: TacStreamable
  );
var
  ClassId: TacStreamableClassId;
begin
  ValidateStreamMode([osmOutput, osmAppend]);

  if (Assigned(Obj)) then
  begin
    { Get the class id }
    ClassId := AddClassRef(Obj);
    { Save the class id }
    GetStream.WriteBuffer(ClassId, SizeOf(ClassId));
    { Save the object }
    Obj.SaveToStream(self);
  end;
end;

{
  ReadObject
  Reads a TacStreamable object from the stream.
  If Obj parameter is nil a new object is created.
  If Obj parameter in not nil, Obj is updated from the stream.
  Returns reference to the read object.
}
function TacObjStream.ReadObject
  (
  const Obj: TacStreamable
  ): TacStreamable;
var
  ClassId: TacStreamableClassId;
  ObjType: TacStreamableClass;
  NewObj: TacStreamable;
begin
  ValidateStreamMode([osmInput]);

  Result := nil;

  { Read class id and get the corresponding class type reference }
  GetStream.ReadBuffer(ClassId, SizeOf(ClassId));
  ObjType := TacStreamableClass(FClassTable.Objects[ClassId]);

  { Create a new object of the proper class from the stream data }
  NewObj := ObjType.CreateFromStream(self);

  if (Assigned(Obj)) then
  begin { Assign created object to passed obj and return obj }
    try
      Obj.Assign(NewObj);
      Result := Obj;
    finally
      NewObj.Free;
    end;
  end
  else
  begin { Just return created object }
    Result := NewObj;
  end;
end;

{
  SaveCStr
  Saves a null-terminated string to the stream.
}
procedure TacObjStream.SaveCStr
  (
  const CStr: PChar
  );
var
  Size: Word;
begin
  ValidateStreamMode([osmOutput, osmAppend]);

  if (Assigned(CStr)) then
  begin { Save size and string contents to stream }
    Size := StrBufSize(CStr);
    GetStream.WriteBuffer(Size, SizeOf(Size));
    GetStream.WriteBuffer(CStr^, Size);
  end
  else
  begin { Save zero size to stream }
    Size := 0;
    GetStream.WriteBuffer(Size, SizeOf(Size));
  end;
end;

{
  ReadCStr
  Reads a null-terminated string from the stream.
  Returns a pointer to a newly allocated null-terminated string.
}
function TacObjStream.ReadCStr: PChar;
var
  Size: Word;
begin
  Result := nil;

  ValidateStreamMode([osmInput]);

  { Read size of string }
  GetStream.ReadBuffer(Size, SizeOf(Size));

  if (0 < Size) then
  begin { Allocate string and init contents from stream }
    Result := StrAlloc(Size);
    GetStream.ReadBuffer(Result^, Size);
  end;
end;

{ ************************* TacFileObjStream ******************************** }

{
  Create
  Creates an TacObjStream instance tied to a specific disk file.
}
constructor TacFileObjStream.Create
  (
  const Filename: TFilename
  );
begin
  inherited Create;
  FFilename := Filename;
end;

{
  Destroy (override)
}
destructor TacFileObjStream.Destroy;
begin
  inherited Destroy;

  { Postponed stream free so TacObjStream can close it up, if needed }
  FFileStream.Free;
end;

{
  GetStream (override)
  Returns the contained TFileStream.
}
function TacFileObjStream.GetStream: TStream;
begin
  Result := FFileStream;
end;

{
  OpenStream (override)
  Opens the contained TFileStream.
}
procedure TacFileObjStream.OpenStream
  (
  const Mode: TacObjStreamMode
  );
var
  StreamFileMode: Word;
begin
  case Mode of
    osmInput:
      StreamFileMode := fmOpenRead or fmShareDenyWrite;
    osmOutput:
      StreamFileMode := fmCreate;
    osmAppend:
      StreamFileMode := fmOpenReadWrite or fmShareDenyWrite;
  else
    StreamFileMode := fmOpenReadWrite or fmShareDenyWrite;
  end;
  FFileStream := TFileStream.Create(Filename, StreamFileMode);
end;

{
  CloseStream (override)
  Closes the contained TFileStream.
}
procedure TacFileObjStream.CloseStream;
begin
  FFileStream.Free;
  FFileStream := nil;
end;

{ ************************* TacMemoryObjStream ****************************** }

{ NOTE: Open and close are essentially null operations on a memory stream. }

{
  Create
  Creates an TacObjStream instance tied to memory.
}
constructor TacMemoryObjStream.Create;
begin
  inherited Create;
  { Create the actual TMemoryStream }
  FMemoryStream := TMemoryStream.Create;
end;

{
  Destroy (override)
}
destructor TacMemoryObjStream.Destroy;
begin
  inherited Destroy;

  { Postponed stream free so TacObjStream can close it up, if needed }
  FMemoryStream.Free;
end;

{
  GetStream (override)
  Returns the contained TMemoryStream.
}
function TacMemoryObjStream.GetStream: TStream;
begin
  Result := FMemoryStream;
end;

{
  OpenStream (override)
  There's nothing to do. memory is always 'open' and always supports all
  input/output operations.
}
procedure TacMemoryObjStream.OpenStream
  (
  const Mode: TacObjStreamMode
  );
begin
end;

{
  CloseStream (override)
  There's nothing to do. memory is always 'open'. and always supports all
}
procedure TacMemoryObjStream.CloseStream;
begin
end;

end.
