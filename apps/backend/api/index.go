package api

import (
	"net/http"

	"github.com/daydev/mbg-system/backend/internal/app"
)

var container *app.AppContainer

func init() {
	// Initialize once during the cold start for Vercel Serverless Functions
	// isServerless = true
	container = app.SetupApp(true)
}

// Handler is the Vercel serverless function entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	container.Router.ServeHTTP(w, r)
}
