unit Logstrm;

interface

uses ACStream, ACList, SysUtils, Classes, LogItem;

type
  TSignature = String[6];

  TLogStream = class(TacFileObjStream)
  private
    FSignature: TSignature;
  protected
    procedure ReadHeader; override;
    procedure SaveHeader; override;
  end;

implementation

const
  LOG_SIGNATURE: TSignature = 'LOGDAT';

procedure TLogStream.ReadHeader;
begin
  ReadBuffer(FSignature, sizeof(FSignature));
  if (FSignature <> LOG_SIGNATURE) then
  begin
    raise Exception.Create('Unrecognized data file');
  end;
end;

procedure TLogStream.SaveHeader;
begin
  FSignature := LOG_SIGNATURE;
  SaveBuffer(FSignature, sizeof(FSignature));
end;

end.
