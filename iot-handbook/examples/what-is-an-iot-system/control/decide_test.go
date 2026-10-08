package control

import "testing"

func TestDecisionBoundariesAndInvalidReadings(t *testing.T) {
	cases := []struct {
		name    string
		mode    Mode
		reading Reading
		want    Decision
	}{
		{"below", Auto, Reading{true, 259}, Decision{false, "below_threshold"}},
		{"equal", Auto, Reading{true, 260}, Decision{true, "at_or_above_threshold"}},
		{"above", Auto, Reading{true, 300}, Decision{true, "at_or_above_threshold"}},
		{"invalid is not cool", Auto, Reading{false, 999}, Decision{false, "invalid_reading"}},
		{"calibration on ignores failure", ForceOn, Reading{}, Decision{true, "forced_on"}},
		{"calibration off ignores heat", ForceOff, Reading{true, 999}, Decision{false, "forced_off"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Decide(tc.mode, tc.reading, 260); got != tc.want {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
	// A recovered reading must leave the failure fallback.
	if got := Decide(Auto, Reading{true, 270}, 260); !got.LEDOn {
		t.Fatal("recovery did not restore the decision")
	}
}

func TestCommandsAndBounds(t *testing.T) {
	mode, threshold := Auto, int16(260)
	for _, c := range []byte("1+-0a\r\n?") {
		mode, threshold = Command(mode, threshold, c)
	}
	if mode != Auto || threshold != 260 {
		t.Fatalf("mode=%v threshold=%v", mode, threshold)
	}
	for i := 0; i < 10000; i++ {
		mode, threshold = Command(mode, threshold, '+')
	}
	if threshold != 800 {
		t.Fatal("upper bound", threshold)
	}
	for i := 0; i < 10000; i++ {
		mode, threshold = Command(mode, threshold, '-')
	}
	if threshold != -400 {
		t.Fatal("lower bound", threshold)
	}
}
