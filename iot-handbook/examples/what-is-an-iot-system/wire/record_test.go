package wire

import (
	"bytes"
	"encoding/json"
	"handbook.local/iot001/control"
	"testing"
)

func TestJSONPreservesBeliefAndEvidence(t *testing.T) {
	for _, valid := range []bool{true, false} {
		for _, light := range []bool{true, false} {
			var b bytes.Buffer
			s := Sample{Seq: 4294967295, Millis: 30017, Mode: control.Auto,
				Reading: control.Reading{Valid: valid, TempDeciC: -3}, ThresholdDeciC: 260,
				Decision:    control.Decision{LEDOn: true, Reason: "at_or_above_threshold"},
				PinReadback: false, HasLight: light, LightRaw: 731}
			WriteSample(&b, s)
			var r map[string]interface{}
			if err := json.Unmarshal(b.Bytes(), &r); err != nil {
				t.Fatal(err, b.String())
			}
			if r["seq"] != float64(s.Seq) || r["commanded"] != float64(1) || r["pin_readback"] != float64(0) || r["threshold_c"] != 26.0 {
				t.Fatal(r)
			}
			if valid {
				if r["temp_c"] != -0.3 {
					t.Fatal(r)
				}
			} else {
				if r["temp_c"] != nil || r["reading"] != "invalid" {
					t.Fatal(r)
				}
			}
			_, present := r["light_raw"]
			if present != light {
				t.Fatal("optional observer", r)
			}
			if b.Bytes()[b.Len()-1] != '\n' {
				t.Fatal("missing record delimiter")
			}
		}
	}
}
func TestADCScaleMatchesCalibration(t *testing.T) {
	for _, n := range []uint16{0, 1, 200, 620, 1023} {
		if got := LightCounts(n << 6); got != n {
			t.Fatalf("%d -> %d", n, got)
		}
	}
}
