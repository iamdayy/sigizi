package qc

import (
	"context"
	"log"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
)

// IoTListener is responsible for receiving real-time telemetry from Cold Chain sensors.
// For this implementation, it simulates a background daemon that could be connected
// to an MQTT broker (e.g., Mosquitto) or WebSockets.
type IoTListener struct {
	qcService Service
	ctx       context.Context
	cancel    context.CancelFunc
}

type TemperaturePayload struct {
	DeviceID        string  `json:"device_id"`
	StorageArea     string  `json:"storage_area"`
	TemperatureCel  float64 `json:"temperature_cel"`
	HumidityPercent float64 `json:"humidity_percent"`
	Timestamp       int64   `json:"timestamp"`
}

func NewIoTListener(qcService Service) *IoTListener {
	ctx, cancel := context.WithCancel(context.Background())
	return &IoTListener{
		qcService: qcService,
		ctx:       ctx,
		cancel:    cancel,
	}
}

func (l *IoTListener) Start() {
	log.Println("[IOT_LISTENER] Starting Cold Chain Telemetry Listener daemon...")

	// In a real application, you would connect to MQTT here using paho.mqtt.golang
	// Example: client.Subscribe("mbg/qc/coldchain/+/temp", 0, l.mqttHandler)

	// Simulate receiving telemetry data every few minutes for testing purposes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-l.ctx.Done():
				log.Println("[IOT_LISTENER] Stopping daemon...")
				return
			case <-ticker.C:
				// Simulate receiving a payload
				payload := TemperaturePayload{
					DeviceID:        "SENSOR-CHILLER-01",
					StorageArea:     "Chiller Susu Pasteur",
					TemperatureCel:  3.5,
					HumidityPercent: 80.0,
					Timestamp:       time.Now().Unix(),
				}
				l.handlePayload(payload)
			}
		}
	}()
}

func (l *IoTListener) Stop() {
	l.cancel()
}

func (l *IoTListener) handlePayload(payload TemperaturePayload) {
	// Parse the data and save it as a TemperatureLog with Source: TempSourceIoT
	source := models.TempSourceIoT
	alertThreshold := 4.0
	humidity := payload.HumidityPercent

	req := &CreateTemperatureLogRequest{
		StorageArea:     payload.StorageArea,
		Source:          &source,
		DeviceID:        payload.DeviceID,
		TemperatureCel:  payload.TemperatureCel,
		HumidityPercent: &humidity,
		AlertThreshold:  &alertThreshold,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logRecord, err := l.qcService.CreateTemperatureLog(ctx, req, nil) // UserID is nil because it's automated
	if err != nil {
		log.Printf("[IOT_LISTENER] ERROR: Failed to save telemetry: %v", err)
		return
	}

	// The service handles setting the 'IsAlert' flag if threshold is exceeded
	if logRecord.IsAlert {
		log.Printf("[IOT_LISTENER] 🚨 ALERT! Storage '%s' temperature is %.1f°C (Threshold: %.1f°C).",
			logRecord.StorageArea, logRecord.TemperatureCel, logRecord.AlertThreshold)
	} else {
		log.Printf("[IOT_LISTENER] Recorded normal telemetry for '%s': %.1f°C", logRecord.StorageArea, logRecord.TemperatureCel)
	}
}
