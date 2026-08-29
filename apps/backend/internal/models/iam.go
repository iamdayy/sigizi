package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleAdmin     UserRole = "ADMIN"
	RoleFinance   UserRole = "FINANCE"
	RoleWarehouse UserRole = "WAREHOUSE"
)

type User struct {
	AuditModel
	Email        string   `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string   `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string   `gorm:"type:varchar(255);not null" json:"full_name"`
	Role         UserRole `gorm:"type:varchar(32);not null;default:'WAREHOUSE'" json:"role"`
	PhoneNumber  string   `gorm:"type:varchar(50)" json:"phone_number,omitempty"`
	IsActive     bool     `gorm:"type:boolean;not null;default:true" json:"is_active"`
}

type RefreshToken struct {
	AuditModel
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	TokenHash string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"token_hash"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Revoked   bool      `gorm:"type:boolean;not null;default:false" json:"revoked"`
}
