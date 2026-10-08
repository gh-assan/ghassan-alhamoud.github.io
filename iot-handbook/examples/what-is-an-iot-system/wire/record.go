// Package wire emits the lab's JSON without fmt or floating-point formatting.
package wire

import "handbook.local/iot001/control"

type ByteWriter interface{ WriteByte(byte) error }
type Sample struct {
	Seq            uint32
	Millis         uint32
	Mode           control.Mode
	Reading        control.Reading
	ThresholdDeciC int16
	Decision       control.Decision
	PinReadback    bool
	HasLight       bool
	LightRaw       uint16 // AVR's original 10-bit counts, not TinyGo's left-aligned value.
}

func text(w ByteWriter, s string) {
	for i := 0; i < len(s); i++ {
		_ = w.WriteByte(s[i])
	}
}
func number(w ByteWriter, n uint32) {
	var b [10]byte
	i := len(b)
	for {
		i--
		b[i] = byte(n%10) + '0'
		n /= 10
		if n == 0 {
			break
		}
	}
	for ; i < len(b); i++ {
		_ = w.WriteByte(b[i])
	}
}
func decimal(w ByteWriter, n int16) {
	v := int32(n)
	if v < 0 {
		text(w, "-")
		v = -v
	}
	number(w, uint32(v/10))
	text(w, ".")
	number(w, uint32(v%10))
}
func boolean(w ByteWriter, v bool) {
	if v {
		text(w, "1")
	} else {
		text(w, "0")
	}
}

// WriteSample uses only fixed field names and internally selected strings.
// UART WriteByte on this board does not return transmission errors; this is a
// local telemetry stream, not a delivery acknowledgement or a physical proof.
func WriteSample(w ByteWriter, s Sample) {
	text(w, `{"seq":`)
	number(w, s.Seq)
	text(w, `,"t_ms":`)
	number(w, s.Millis)
	text(w, `,"mode":"`)
	text(w, s.Mode.String())
	text(w, `","reading":"`)
	if s.Reading.Valid {
		text(w, "ok")
	} else {
		text(w, "invalid")
	}
	text(w, `","temp_c":`)
	if s.Reading.Valid {
		decimal(w, s.Reading.TempDeciC)
	} else {
		text(w, "null")
	}
	text(w, `,"threshold_c":`)
	decimal(w, s.ThresholdDeciC)
	text(w, `,"reason":"`)
	text(w, s.Decision.Reason)
	text(w, `","commanded":`)
	boolean(w, s.Decision.LEDOn)
	text(w, `,"pin_readback":`)
	boolean(w, s.PinReadback)
	if s.HasLight {
		text(w, `,"light_raw":`)
		number(w, uint32(s.LightRaw))
	}
	text(w, "}\n")
}

// AVR ADC values are left-aligned by TinyGo: restore the lab's 0..1023 scale.
func LightCounts(raw uint16) uint16 { return raw >> 6 }
