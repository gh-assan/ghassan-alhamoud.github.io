// Package control contains hardware-independent lab decisions.
package control

type Mode uint8

const (
	Auto Mode = iota
	ForceOn
	ForceOff
)

func (m Mode) String() string {
	switch m {
	case Auto:
		return "auto"
	case ForceOn:
		return "force_on"
	case ForceOff:
		return "force_off"
	default:
		return "unknown"
	}
}

// TempDeciC is Celsius multiplied by ten; meaningful only when Valid is true.
type Reading struct {
	Valid     bool
	TempDeciC int16
}
type Decision struct {
	LEDOn  bool
	Reason string
}

func Decide(mode Mode, reading Reading, thresholdDeciC int16) Decision {
	if mode == ForceOn {
		return Decision{true, "forced_on"}
	}
	if mode == ForceOff {
		return Decision{false, "forced_off"}
	}
	if !reading.Valid {
		return Decision{false, "invalid_reading"}
	}
	if reading.TempDeciC >= thresholdDeciC {
		return Decision{true, "at_or_above_threshold"}
	}
	return Decision{false, "below_threshold"}
}

// Command handles the lab's single-byte protocol. Bounds prevent overflow.
func Command(mode Mode, threshold int16, c byte) (Mode, int16) {
	switch c {
	case 'a':
		mode = Auto
	case '1':
		mode = ForceOn
	case '0':
		mode = ForceOff
	case '+':
		if threshold < 800 {
			threshold += 5
		}
	case '-':
		if threshold > -400 {
			threshold -= 5
		}
	}
	return mode, threshold
}
