export const calculateSpanSetResistance = (
  measuredSpan: number,
  bridgeResistance: number,
  totalRm: number,
  desiredSpan: number
): number => {
  if (desiredSpan === 0) {
    throw new Error('desiredSpan must be non-zero')
  }
  return ((measuredSpan * (bridgeResistance + totalRm)) / desiredSpan) - (bridgeResistance + totalRm)
}
