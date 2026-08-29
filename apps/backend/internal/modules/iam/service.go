package iam

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/middleware"
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, req *RefreshTokenRequest) (*AuthResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetNavigation(ctx context.Context, role models.UserRole) []NavigationItem
	CreateUser(ctx context.Context, req *CreateUserRequest, creatorID uuid.UUID) (*models.User, error)
	ListUsers(ctx context.Context) ([]models.User, error)
}

type service struct {
	repo Repository
	cfg  *config.Config
}

func NewService(repo Repository, cfg *config.Config) Service {
	return &service{repo: repo, cfg: cfg}
}

func (s *service) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	return s.generateTokens(ctx, user)
}

func (s *service) RefreshToken(ctx context.Context, req *RefreshTokenRequest) (*AuthResponse, error) {
	tokenHash := hashToken(req.RefreshToken)
	storedToken, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	// Revoke the old refresh token (Rotation security)
	_ = s.repo.RevokeRefreshToken(ctx, tokenHash)

	// Fetch fresh user data
	user, err := s.repo.GetUserByID(ctx, storedToken.UserID)
	if err != nil || !user.IsActive {
		return nil, errors.New("user account is inactive or not found")
	}

	return s.generateTokens(ctx, user)
}

func (s *service) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	tokenHash := hashToken(refreshToken)
	return s.repo.RevokeRefreshToken(ctx, tokenHash)
}

func (s *service) GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *service) generateTokens(ctx context.Context, user *models.User) (*AuthResponse, error) {
	accessDuration := time.Duration(s.cfg.JWTAccessDurationMinutes) * time.Minute
	refreshDuration := time.Duration(s.cfg.JWTRefreshDurationDays) * 24 * time.Hour

	now := time.Now()
	accessExpiresAt := now.Add(accessDuration)
	refreshExpiresAt := now.Add(refreshDuration)

	// Generate Access Token (JWT)
	claims := middleware.JWTClaims{
		UserID:   user.ID,
		Email:    user.Email,
		Role:     user.Role,
		FullName: user.FullName,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpiresAt),
			Issuer:    "mbg-sppg-system",
		},
	}

	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessTokenStr, err := accessTokenObj.SignedString([]byte(s.cfg.JWTAccessSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// Generate Cryptographic Refresh Token
	rawRefreshToken := uuid.New().String() + "-" + uuid.New().String()
	tokenHash := hashToken(rawRefreshToken)

	refreshTokenModel := &models.RefreshToken{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: refreshExpiresAt,
		Revoked:   false,
	}

	if err := s.repo.SaveRefreshToken(ctx, refreshTokenModel); err != nil {
		return nil, fmt.Errorf("failed to persist refresh token: %w", err)
	}

	return &AuthResponse{
		AccessToken:  accessTokenStr,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    int(accessDuration.Seconds()),
		User:         user,
	}, nil
}

func (s *service) GetNavigation(ctx context.Context, role models.UserRole) []NavigationItem {
	allNavs := []NavigationItem{
		{
			Title: "Dashboard",
			Href:  "/dashboard",
			Icon:  "LayoutDashboard",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleFinance, models.RoleWarehouse},
		},
		{
			Title: "Bahan Baku & Stok",
			Href:  "/dashboard/inventory",
			Icon:  "Boxes",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleWarehouse},
		},
		{
			Title: "Produksi",
			Href:  "/dashboard/finance/cogs",
			Icon:  "Calculator",
			Badge: "Real-time",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleFinance},
		},
		{
			Title: "Keuangan",
			Href:  "/dashboard/finance",
			Icon:  "Receipt",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleFinance},
		},
		{
			Title: "Distribusi Sekolah",
			Href:  "/dashboard/distribution",
			Icon:  "Truck",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleWarehouse, models.RoleFinance},
		},
		{
			Title: "Berita Acara Serah Terima",
			Href:  "/dashboard/distribution/bast",
			Icon:  "FileText",
			Badge: "Dokumen",
			Roles: []models.UserRole{models.RoleAdmin, models.RoleFinance},
		},
		{
			Title: "Manajemen Pengguna",
			Href:  "/dashboard/settings/users",
			Icon:  "Users",
			Roles: []models.UserRole{models.RoleAdmin},
		},
	}

	var filtered []NavigationItem
	for _, item := range allNavs {
		for _, r := range item.Roles {
			if r == role {
				filtered = append(filtered, item)
				break
			}
		}
	}
	return filtered
}

func (s *service) CreateUser(ctx context.Context, req *CreateUserRequest, creatorID uuid.UUID) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		AuditModel: models.AuditModel{
			CreatedBy: &creatorID,
		},
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Role:         req.Role,
		PhoneNumber:  req.PhoneNumber,
		IsActive:     true,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("email already exists or database error: %w", err)
	}

	return user, nil
}

func (s *service) ListUsers(ctx context.Context) ([]models.User, error) {
	return s.repo.ListUsers(ctx)
}

func hashToken(token string) string {
	hasher := sha256.New()
	hasher.Write([]byte(token))
	return hex.EncodeToString(hasher.Sum(nil))
}
