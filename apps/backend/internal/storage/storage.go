package storage

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/daydev/mbg-system/backend/internal/config"
)

type StorageService interface {
	UploadFile(ctx context.Context, filename string, data []byte, contentType string) (string, error)
}

type LocalStorage struct {
	basePath string
	baseURL  string
}

func NewLocalStorage(basePath string, port string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create local storage directory: %w", err)
	}
	baseURL := fmt.Sprintf("http://localhost:%s/uploads", port)
	return &LocalStorage{basePath: basePath, baseURL: baseURL}, nil
}

func (l *LocalStorage) UploadFile(ctx context.Context, filename string, data []byte, contentType string) (string, error) {
	filePath := filepath.Join(l.basePath, filename)
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file to disk: %w", err)
	}

	return fmt.Sprintf("%s/%s", l.baseURL, filename), nil
}

type R2Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

func NewR2Storage(ctx context.Context, cfg *config.Config) (*R2Storage, error) {
	if cfg.S3Endpoint == "" || cfg.S3AccessKeyID == "" || cfg.S3SecretAccessKey == "" {
		return nil, fmt.Errorf("missing R2/S3 credentials")
	}

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: cfg.S3Endpoint,
		}, nil
	})

	awsCfg, err := awsConfig.LoadDefaultConfig(ctx,
		awsConfig.WithEndpointResolverWithOptions(r2Resolver),
		awsConfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3AccessKeyID,
			cfg.S3SecretAccessKey,
			"",
		)),
		awsConfig.WithRegion(cfg.S3Region),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load R2 config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)
	return &R2Storage{
		client:    client,
		bucket:    cfg.S3BucketName,
		publicURL: cfg.S3PublicBaseURL,
	}, nil
}

func (r *R2Storage) UploadFile(ctx context.Context, filename string, data []byte, contentType string) (string, error) {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object to R2/S3: %w", err)
	}

	if r.publicURL != "" {
		return fmt.Sprintf("%s/%s", r.publicURL, filename), nil
	}
	return fmt.Sprintf("r2://%s/%s", r.bucket, filename), nil
}

func NewStorageService(cfg *config.Config) StorageService {
	if cfg.StorageDriver == "s3" && cfg.S3Endpoint != "" {
		r2, err := NewR2Storage(context.Background(), cfg)
		if err == nil {
			log.Println("[STORAGE] Initialized Cloudflare R2 / S3 storage engine")
			return r2
		}
		log.Printf("[STORAGE] Failed to initialize R2: %v. Falling back to local storage.", err)
	}

	local, err := NewLocalStorage(cfg.LocalStoragePath, cfg.AppPort)
	if err != nil {
		log.Fatalf("[STORAGE] Failed to initialize local storage: %v", err)
	}
	log.Printf("[STORAGE] Initialized Local Disk storage engine at '%s'", cfg.LocalStoragePath)
	return local
}
