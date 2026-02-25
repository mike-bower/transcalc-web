unit Logitem;

interface

uses ACStream, ACList, SysUtils, Classes;

type
  TLogItem = class(TacStreamable)
  private
  protected
    procedure AssignTo(Dest: TPersistent); override;
    procedure InitFields; override;
    procedure SaveToStream(Stream: TacObjStream); override;
    procedure ReadFromStream(Stream: TacObjStream); override;
    procedure ShowTheForm; override;
    procedure PrintTheForm; override;
  public
  end;

implementation

procedure TLogItem.AssignTo(Dest: TPersistent);
begin
  if ((Dest is TLogItem) and (Self is Dest.ClassType)) then
  begin
    with Dest as TLogItem do
    begin
      { FTimeStamp := Self.FTimeStamp; }
    end;
  end
  else
  begin
    inherited AssignTo(Dest);
  end;
end;

procedure TLogItem.InitFields;
begin
  inherited InitFields;
  { FTimeStamp := Now; }
end;

procedure TLogItem.PrintTheForm;
begin

end;

procedure TLogItem.SaveToStream(Stream: TacObjStream);
begin
  { Stream.SaveBuffer(FTimeStamp, sizeof(FTimeStamp); }
end;

procedure TLogItem.ShowTheForm;
begin

end;

procedure TLogItem.ReadFromStream(Stream: TacObjStream);
begin
  { Stream.ReadBuffer(FTimeStamp, sizeof(FTimeStamp); }
end;

end.
