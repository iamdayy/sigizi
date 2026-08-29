package models

import (
	"time"

	"github.com/google/uuid"
)

type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "PRESENT"
	AttendanceAbsent  AttendanceStatus = "ABSENT"
	AttendanceSick    AttendanceStatus = "SICK"
	AttendanceLeave   AttendanceStatus = "LEAVE"
)

type Attendance struct {
	AuditModel
	UserID            uuid.UUID        `gorm:"type:uuid;not null;index" json:"user_id"`
	User              *User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Date              time.Time        `gorm:"type:date;not null;index" json:"date"`
	Status            AttendanceStatus `gorm:"type:varchar(32);not null;default:'PRESENT'" json:"status"`
	CheckIn           time.Time        `gorm:"type:timestamptz;not null" json:"check_in"`
	CheckInPhotoURL   string           `gorm:"type:text" json:"check_in_photo_url,omitempty"`
	CheckInLatitude   *float64         `gorm:"type:numeric(10,7)" json:"check_in_latitude,omitempty"`
	CheckInLongitude  *float64         `gorm:"type:numeric(10,7)" json:"check_in_longitude,omitempty"`
	CheckOut          *time.Time       `gorm:"type:timestamptz" json:"check_out,omitempty"`
	CheckOutPhotoURL  string           `gorm:"type:text" json:"check_out_photo_url,omitempty"`
	CheckOutLatitude  *float64         `gorm:"type:numeric(10,7)" json:"check_out_latitude,omitempty"`
	CheckOutLongitude *float64         `gorm:"type:numeric(10,7)" json:"check_out_longitude,omitempty"`
	WorkShift         string           `gorm:"type:varchar(50);default:'PAGI'" json:"work_shift,omitempty"` // PAGI, SIANG
	Notes             string           `gorm:"type:text" json:"notes,omitempty"`
}
