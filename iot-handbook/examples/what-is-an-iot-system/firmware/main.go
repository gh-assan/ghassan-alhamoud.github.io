//go:build tinygo && arduino_mega2560

// IOT-001: Mega 2560, DHT11 on D2, resistor + LED on D9, optional light on A0.
// Read lab.md before wiring. Serial commands: a, 1, 0, +, - at 115200 baud.
package main

import (
	"handbook.local/iot001/control"
	"handbook.local/iot001/wire"
	"machine"
	"time"
	"tinygo.org/x/drivers/dht"
)

const hasLightSensor = true // Set false when no photoresistor is fitted.
const sampleInterval = 2500 * time.Millisecond
const observeDelay = 500 * time.Millisecond

func main() {
	led := machine.D9
	led.Low()
	led.Configure(machine.PinConfig{Mode: machine.PinOutput})
	serial := machine.UART0
	serial.Configure(machine.UARTConfig{BaudRate: 115200})
	machine.InitADC()
	light := machine.ADC{Pin: machine.A0}
	if hasLightSensor {
		light.Configure(machine.ADCConfig{})
	}
	sensor := dht.NewDummyDevice(machine.D2, dht.DHT11)
	println(`{"event":"boot","firmware":"iot001_belief_vs_effect","version":"2.0.0"}`)
	mode, threshold := control.Auto, int16(260)
	started := time.Now()
	lastSample := started
	var seq uint32
	for {
		for serial.Buffered() > 0 {
			c, err := serial.ReadByte()
			if err == nil {
				mode, threshold = control.Command(mode, threshold, c)
			}
		}
		if time.Since(lastSample) < sampleInterval {
			time.Sleep(10 * time.Millisecond)
			continue
		}
		lastSample = time.Now()
		seq++
		// The driver's getter can retain the last successful measurement. Only
		// consume it after this attempt succeeds; otherwise report invalid/null.
		reading := control.Reading{}
		if err := sensor.ReadMeasurements(); err == nil {
			temp, err := sensor.Temperature()
			reading = control.Reading{Valid: err == nil, TempDeciC: temp}
		}
		decision := control.Decide(mode, reading, threshold)
		led.Set(decision.LEDOn)
		time.Sleep(observeDelay)
		sample := wire.Sample{Seq: seq, Millis: uint32(time.Since(started) / time.Millisecond),
			Mode: mode, Reading: reading, ThresholdDeciC: threshold, Decision: decision,
			PinReadback: led.Get(), HasLight: hasLightSensor}
		if hasLightSensor {
			sample.LightRaw = wire.LightCounts(light.Get())
		}
		wire.WriteSample(serial, sample)
	}
}
