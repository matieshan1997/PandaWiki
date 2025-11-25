package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
)

const (
	machineIDFile  = "/data/.machine_id"
	reportInterval = time.Hour
)

// Client is the telemetry client
type Client struct {
	baseURL     string
	httpClient  *http.Client
	machineID   string
	firstReport bool
	stopChan    chan struct{}
	logger      *log.Logger
	repo        *pg.KnowledgeBaseRepository
}

// NewClient creates a new telemetry client
func NewClient(logger *log.Logger, repo *pg.KnowledgeBaseRepository) (*Client, error) {
	baseURL := "https://baizhi.cloud/api/public/data/report"
	client := &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		firstReport: true,
		stopChan:    make(chan struct{}),
		logger:      logger.WithModule("telemetry"),
		repo:        repo,
	}

	// get or create machine ID
	machineID, err := client.getOrCreateMachineID()
	if err != nil {
		logger.Error("failed to get or create machine ID", log.Error(err))
		return nil, fmt.Errorf("failed to get or create machine ID: %w", err)
	}
	client.machineID = machineID

	// report immediately on startup
	if err := client.reportInstallation(); err != nil {
		logger.Error("initial report installation", log.Error(err))
	}

	// start periodic report
	go client.startPeriodicReport()

	return client, nil
}

func (c *Client) GetMachineID() string {
	return c.machineID
}

func (c *Client) getOrCreateMachineID() (string, error) {
	// get machine id from file
	if id, err := os.ReadFile(machineIDFile); err == nil {
		c.firstReport = false
		return strings.TrimSpace(string(id)), nil
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("failed to read machine ID file: %w", err)
	}

	// ensure dir is exists
	dir := filepath.Dir(machineIDFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create machine ID directory: %w", err)
	}

	// create lock file to prevent concurrent access
	lockFile := machineIDFile + ".lock"
	lock, err := os.OpenFile(lockFile, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			// if lock file already exists, wait and try again
			c.logger.Info("lock file already exists, waiting and trying again")
			time.Sleep(100 * time.Millisecond)
			return c.getOrCreateMachineID()
		}
		return "", fmt.Errorf("failed to create lock file: %w", err)
	}
	defer func() {
		if err := lock.Close(); err != nil {
			c.logger.Error("failed to close lock file", log.Error(err))
		}
		if err := os.Remove(lockFile); err != nil {
			c.logger.Error("failed to remove lock file", log.Error(err))
		}
	}()

	if id, err := os.ReadFile(machineIDFile); err == nil {
		c.firstReport = false
		return strings.TrimSpace(string(id)), nil
	}

	// generate unique ID using UUID
	id := uuid.New().String()

	// write machine ID to file and ensure data is written to disk
	if err := os.WriteFile(machineIDFile, []byte(id), 0o644); err != nil {
		return "", fmt.Errorf("failed to write machine ID file: %w", err)
	}

	// sync file to ensure data is written to disk
	if file, err := os.OpenFile(machineIDFile, os.O_RDWR, 0o644); err == nil {
		if err := file.Sync(); err != nil {
			if err := file.Close(); err != nil {
				c.logger.Error("failed to close machine ID file after write", log.Error(err))
			}
			return "", fmt.Errorf("failed to sync machine ID file: %w", err)
		}
		if err := file.Close(); err != nil {
			c.logger.Error("failed to close machine ID file after sync", log.Error(err))
		}
	}
	return id, nil
}

// startPeriodicReport starts periodic report
func (c *Client) startPeriodicReport() {
	ticker := time.NewTicker(reportInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := c.reportInstallation(); err != nil {
				c.logger.Error("periodic report installation", log.Error(err))
			}
		case <-c.stopChan:
			return
		}
	}
}

// reportInstallation reports installation information
func (c *Client) reportInstallation() error {
	event := InstallationEvent{
		Version:   Version,
		Timestamp: time.Now().Format(time.RFC3339),
		MachineID: c.machineID,
		Type:      "installation",
	}
	if !c.firstReport {
		event.Type = "heartbeat"
	}
	if repoList, err := c.repo.GetKnowledgeBaseList(context.Background()); err != nil {
		c.logger.Error("get knowledge base list failed in telemetry", log.Error(err))
	} else {
		event.KBCount = len(repoList)
	}

	eventRaw, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	eventEncrypted, err := Encrypt([]byte("SZ3SDP38y9Gg2c6yHdLPgDeX"), eventRaw)
	if err != nil {
		return fmt.Errorf("encrypt installation event: %w", err)
	}
	data := map[string]string{
		"index": "panda-wiki-installation",
		"data":  eventEncrypted,
		"id":    uuid.New().String(),
	}
	eventEncryptedRaw, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	req, err := http.NewRequest("POST", c.baseURL, bytes.NewBuffer(eventEncryptedRaw))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	c.firstReport = false

	return nil
}

// Stop stops periodic report
func (c *Client) Stop() {
	close(c.stopChan)
}

// InstallationEvent represents installation event
type InstallationEvent struct {
	Version   string `json:"version"`
	MachineID string `json:"machine_id"`
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`
	KBCount   int    `json:"kb_count"`
}
