unit Ladders;

interface
uses Classes, StdCtrls, ExtCtrls, acStream, acList, Log, LogItem, LogStrm,
     Resistor;

(*
const
  MAXRUNGS = 9;

type TRung = class(TImage)
  Have to think about this one
end;

type TShunt =
      ??????????????????????????;

type
  TLadder =
    array[0..MAXRUNGS] of TRung;
    Sone Ladders have moree rungs than otherrs.  IS this a problem??
*)

type
  TE01 = class(TResistor)
  private
   LadderA : TLadder;  {9 rungs}
   LadderB : TLadder;  {7 rungs}
   LadderC : TLadder;  {7 rungs}
   LadderD : TLadder;  {7 rungs}
   LadderE : TLadder;  {7 rungs}
   LadderF : TLadder;  {9 rungs}
   ShuntA  : TShunt;
   ShuntB  : TShunt;
end;

type
  TD01 = class(TResistor)
  private
   LadderA  : TLadder; {9 rungs}
   LadderB1 : TLadder; {7 rungs}
   LadderB2 : TLadder; {7 rungs}
end;

type
  TC01 = class(TResistor)
end;


implementation

end.
