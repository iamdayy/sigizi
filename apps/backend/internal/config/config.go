package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv   string
	AppPort  string
	Timezone string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// JWT
	JWTAccessSecret           string
	JWTRefreshSecret          string
	JWTAccessDurationMinutes  int
	JWTRefreshDurationDays    int

	// Storage (R2 / S3 / Local)
	StorageDriver     string
	S3Endpoint        string
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3BucketName      string
	S3Region          string
	S3PublicBaseURL   string
	LocalStoragePath  string
}

func LoadConfig() (*Config, error) {
	// Try loading .env from current or parent directories
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../../.env")

	cfg := &Config{
		AppEnv:   getEnv("APP_ENV", "development"),
		AppPort:  getEnv("APP_PORT", "8080"),
		Timezone: getEnv("TZ", "Asia/Jakarta"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres123"),
		DBName:     getEnv("DB_NAME", "mbg_sppg_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTAccessSecret:          getEnv("JWT_ACCESS_SECRET", "mbg_access_secret_super_secure_key_2026_x9281"),
		JWTRefreshSecret:         getEnv("JWT_REFRESH_SECRET", "mbg_refresh_secret_super_secure_key_2026_z8192"),
		JWTAccessDurationMinutes: getEnvAsInt("JWT_ACCESS_DURATION_MINUTES", 15),
		JWTRefreshDurationDays:   getEnvAsInt("JWT_REFRESH_DURATION_DAYS", 7),

		StorageDriver:     getEnv("STORAGE_DRIVER", "local"),
		S3Endpoint:        getEnv("S3_ENDPOINT", ""),
		S3AccessKeyID:     getEnv("S3_ACCESS_KEY_ID", ""),
		S3SecretAccessKey: getEnv("S3_SECRET_ACCESS_KEY", ""),
		S3BucketName:      getEnv("S3_BUCKET_NAME", "mbg-bast-documents"),
		S3Region:          getEnv("S3_REGION", "auto"),
		S3PublicBaseURL:   getEnv("S3_PUBLIC_BASE_URL", ""),
		LocalStoragePath:  getEnv("LOCAL_STORAGE_PATH", "./uploads"),
	}

	return cfg, nil
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode, c.Timezone)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}
