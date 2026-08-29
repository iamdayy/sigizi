package iam

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int          `json:"expires_in"` // seconds
	User         *models.User `json:"user"`
}

type NavigationItem struct {
	Title string            `json:"title"`
	Href  string            `json:"href"`
	Icon  string            `json:"icon"`
	Badge string            `json:"badge,omitempty"`
	Roles []models.UserRole `json:"roles"`
}

type CreateUserRequest struct {
	Email       string          `json:"email" binding:"required,email"`
	Password    string          `json:"password" binding:"required,min=6"`
	FullName    string          `json:"full_name" binding:"required"`
	Role        models.UserRole `json:"role" binding:"required"`
	PhoneNumber string          `json:"phone_number"`
	Position    string          `json:"position"`
	NIK         string          `json:"nik"`
}

type CheckInRequest struct {
	PhotoURL  string   `json:"photo_url"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	WorkShift string   `json:"work_shift"` // PAGI | SIANG
	Notes     string   `json:"notes"`
}

type CheckOutRequest struct {
	PhotoURL  string   `json:"photo_url"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	Notes     string   `json:"notes"`
}

type AttendanceResponse struct {
	ID                uuid.UUID               `json:"id"`
	UserID            uuid.UUID               `json:"user_id"`
	UserName          string                  `json:"user_name"`
	UserRole          models.UserRole         `json:"user_role"`
	Date              string                  `json:"date"`
	Status            models.AttendanceStatus `json:"status"`
	CheckIn           time.Time               `json:"check_in"`
	CheckInPhotoURL   string                  `json:"check_in_photo_url,omitempty"`
	CheckInLatitude   *float64                `json:"check_in_latitude,omitempty"`
	CheckInLongitude  *float64                `json:"check_in_longitude,omitempty"`
	CheckOut          *time.Time              `json:"check_out,omitempty"`
	CheckOutPhotoURL  string                  `json:"check_out_photo_url,omitempty"`
	CheckOutLatitude  *float64                `json:"check_out_latitude,omitempty"`
	CheckOutLongitude *float64                `json:"check_out_longitude,omitempty"`
	WorkShift         string                  `json:"work_shift,omitempty"`
	Notes             string                  `json:"notes,omitempty"`
}
