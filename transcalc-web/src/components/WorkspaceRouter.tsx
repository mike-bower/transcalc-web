import CantileverCalc from './calculators/CantileverCalc'
import ReverseBeamCalc from './calculators/ReverseBeamCalc'
import DualBeamCalc from './calculators/DualBeamCalc'
import SBeamCalc from './calculators/SBeamCalc'
import BinocularBeamWorkspace from './BinocularBeamWorkspace'
import SquareColumnCalc from './calculators/SquareColumnCalc'
import RoundSolidColumnCalc from './calculators/RoundSolidColumnCalc'
import RoundHollowColumnCalc from './calculators/RoundHollowColumnCalc'
import SquareShearCalc from './calculators/SquareShearCalc'
import RoundShearCalc from './calculators/RoundShearCalc'
import RoundSBeamShearCalc from './calculators/RoundSBeamShearCalc'
import SquareTorqueCalc from './calculators/SquareTorqueCalc'
import RoundSolidTorqueCalc from './calculators/RoundSolidTorqueCalc'
import RoundHollowTorqueCalc from './calculators/RoundHollowTorqueCalc'
import PressureCalc from './calculators/PressureCalc'
import ZeroVsTempCalc from './compensation/ZeroVsTempCalc'
import ZeroBalanceCalc from './compensation/ZeroBalanceCalc'
import SpanTemp2PtCalc from './compensation/SpanTemp2PtCalc'
import SpanTemp3PtCalc from './compensation/SpanTemp3PtCalc'
import ShuntOptimCalc from './compensation/ShuntOptimCalc'
import SpanSetCalc from './compensation/SpanSetCalc'
import SimSpanCalc from './compensation/SimSpanCalc'
import TrimVisualizer from './TrimVisualizer'

type UnitSystem = 'SI' | 'US'

type Props = {
  calcKey: string
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
  onHelpTokensChange?: (tokens: Record<string, string>) => void
}

export default function WorkspaceRouter({ calcKey, unitSystem, onUnitChange, onHelpTokensChange }: Props) {
  const sharedProps = { unitSystem, onUnitChange }

  switch (calcKey) {
    // Bending Beams
    case 'bbcant':   return <CantileverCalc {...sharedProps} />
    case 'bino':     return <BinocularBeamWorkspace {...sharedProps} onHelpTokensChange={onHelpTokensChange} />
    case 'dualbb':   return <DualBeamCalc {...sharedProps} />
    case 'revbb':    return <ReverseBeamCalc {...sharedProps} />
    case 'sbbeam':   return <SBeamCalc {...sharedProps} />

    // Compression Columns
    case 'sqrcol':   return <SquareColumnCalc {...sharedProps} />
    case 'rndsldc':  return <RoundSolidColumnCalc {...sharedProps} />
    case 'rndhlwc':  return <RoundHollowColumnCalc {...sharedProps} />

    // Shear Beams
    case 'shrsqr':   return <SquareShearCalc {...sharedProps} />
    case 'shrrnd':   return <RoundShearCalc {...sharedProps} />
    case 'shrrnd1':  return <RoundSBeamShearCalc {...sharedProps} />

    // Torque Shafts
    case 'sqrtor':   return <SquareTorqueCalc {...sharedProps} />
    case 'rndsld':   return <RoundSolidTorqueCalc {...sharedProps} />
    case 'rndhlw':   return <RoundHollowTorqueCalc {...sharedProps} />

    // Pressure
    case 'pressure': return <PressureCalc {...sharedProps} />

    // Calibration / Compensation
    case 'zvstemp':  return <ZeroVsTempCalc {...sharedProps} />
    case 'zerobal':  return <ZeroBalanceCalc {...sharedProps} />
    case 'span2pt':  return <SpanTemp2PtCalc {...sharedProps} />
    case 'span3pt':  return <SpanTemp3PtCalc {...sharedProps} />
    case 'optshunt': return <ShuntOptimCalc {...sharedProps} />
    case 'spanset':  return <SpanSetCalc {...sharedProps} />
    case 'simspan':  return <SimSpanCalc {...sharedProps} />

    // Trim Network Visualizer
    case 'trimvis': return <TrimVisualizer {...sharedProps} />

    default:
      return (
        <div className="bino-wrap">
          <p className="workspace-note">
            Calculator <strong>{calcKey}</strong> will be available in a future phase. Select another topic from the left panel.
          </p>
        </div>
      )
  }
}
