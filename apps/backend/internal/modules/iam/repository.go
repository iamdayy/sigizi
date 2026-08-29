package iam

import (
	"context"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	ListUsers(ctx context.Context) ([]models.User, error)

	SaveRefreshToken(ctx context.Context, token *models.RefreshToken) error
	GetRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error

	// Attendance
	CreateAttendance(ctx context.Context, att *models.Attendance) error
	GetAttendanceByID(ctx context.Context, id uuid.UUID) (*models.Attendance, error)
	GetTodayAttendance(ctx context.Context, userID uuid.UUID, today time.Time) (*models.Attendance, error)
	UpdateAttendance(ctx context.Context, att *models.Attendance) error
	ListAttendances(ctx context.Context, date *time.Time, userID *uuid.UUID) ([]models.Attendance, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ? AND is_active = true", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ? AND is_active = true", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) CreateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) ListUsers(ctx context.Context) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&users).Error
	return users, err
}

func (r *repository) SaveRefreshToken(ctx context.Context, token *models.RefreshToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *repository) GetRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	var token models.RefreshToken
	err := r.db.WithContext(ctx).Preload("User").Where("token_hash = ? AND revoked = false AND expires_at > ?", tokenHash, time.Now()).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	return r.db.WithContext(ctx).Model(&models.RefreshToken{}).Where("token_hash = ?", tokenHash).Update("revoked", true).Error
}

func (r *repository) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.RefreshToken{}).Where("user_id = ?", userID).Update("revoked", true).Error
}

func (r *repository) CreateAttendance(ctx context.Context, att *models.Attendance) error {
	return r.db.WithContext(ctx).Create(att).Error
}

func (r *repository) GetAttendanceByID(ctx context.Context, id uuid.UUID) (*models.Attendance, error) {
	var att models.Attendance
	err := r.db.WithContext(ctx).Preload("User").Where("id = ?", id).First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *repository) GetTodayAttendance(ctx context.Context, userID uuid.UUID, today time.Time) (*models.Attendance, error) {
	var att models.Attendance
	startOfDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	endOfDay := time.Date(today.Year(), today.Month(), today.Day(), 23, 59, 59, 999999999, today.Location())

	err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ? AND date BETWEEN ? AND ?", userID, startOfDay, endOfDay).
		Order("created_at DESC").
		First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *repository) UpdateAttendance(ctx context.Context, att *models.Attendance) error {
	return r.db.WithContext(ctx).Save(att).Error
}

func (r *repository) ListAttendances(ctx context.Context, date *time.Time, userID *uuid.UUID) ([]models.Attendance, error) {
	var list []models.Attendance
	query := r.db.WithContext(ctx).Preload("User")

	if date != nil {
		start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		end := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, date.Location())
		query = query.Where("date BETWEEN ? AND ?", start, end)
	}
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Order("check_in DESC").Find(&list).Error
	return list, err
}
