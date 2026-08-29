package iam

import (
	"github.com/daydev/mbg-system/backend/internal/models"
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
}
