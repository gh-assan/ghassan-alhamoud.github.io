TINYGO ?= tinygo
GO ?= go
TARGET := arduino-mega2560
BUILD ?= $(CURDIR)/.build

.PHONY: test compile flash

test:
	$(GO) test ./control ./wire
	python3 -m unittest discover -s tests -p 'test_*.py' -v

compile:
	mkdir -p $(BUILD)
	$(TINYGO) build -target $(TARGET) -size short -o $(BUILD)/iot001.hex ./firmware

# Explicit hardware operation; never part of test or compile.
flash:
	@test -n "$(PORT)" || (echo 'Set PORT to the actual device'; exit 1)
	$(TINYGO) flash -target $(TARGET) -port $(PORT) ./firmware
