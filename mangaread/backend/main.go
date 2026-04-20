package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

// Manga represents a manga entry
type Manga struct {
	ID           int      `json:"mal_id"`
	Title        string   `json:"title"`
	TitleEnglish string   `json:"title_english"`
	Synopsis     string   `json:"synopsis"`
	Chapters     int      `json:"chapters"`
	Volumes      int      `json:"volumes"`
	Status       string   `json:"status"`
	Score        float64  `json:"score"`
	Images       Images   `json:"images"`
	Genres       []Genre  `json:"genres"`
	Authors      []Author `json:"authors"`
	URL          string   `json:"url"`
}

type Images struct {
	JPG ImageURL `json:"jpg"`
}

type ImageURL struct {
	ImageURL      string `json:"image_url"`
	SmallImageURL string `json:"small_image_url"`
	LargeImageURL string `json:"large_image_url"`
}

type Genre struct {
	Name string `json:"name"`
}

type Author struct {
	Name string `json:"name"`
}

// Jikan API response structures
type JikanResponse struct {
	Data []Manga `json:"data"`
}

type JikanSingleResponse struct {
	Data Manga `json:"data"`
}

type JikanChaptersResponse struct {
	Data []Chapter `json:"data"`
}

type Chapter struct {
	MalID   int    `json:"mal_id"`
	Title   string `json:"title"`
	URL     string `json:"url"`
	Chapter string `json:"chapter"`
}

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	CreatedAt time.Time `json:"created_at"`
}

// Bookmark represents a user's bookmark
type Bookmark struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	MangaID    int       `json:"manga_id"`
	MangaTitle string    `json:"manga_title"`
	Chapter    int       `json:"chapter"`
	Page       int       `json:"page"`
	CreatedAt  time.Time `json:"created_at"`
}

// ReadingHistory represents user's reading history
type ReadingHistory struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	MangaID    int       `json:"manga_id"`
	MangaTitle string    `json:"manga_title"`
	Chapter    int       `json:"chapter"`
	Page       int       `json:"page"`
	ReadAt     time.Time `json:"read_at"`
}

var (
	jikanBaseURL = "https://api.jikan.moe/v4"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	r := mux.NewRouter()

	// CORS configuration
	corsObj := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	// API routes
	api := r.PathPrefix("/api").Subrouter()

	// Manga routes
	api.HandleFunc("/manga/top", getTopManga).Methods("GET")
	api.HandleFunc("/manga/popular", getPopularManga).Methods("GET")
	api.HandleFunc("/manga/latest", getLatestManga).Methods("GET")
	api.HandleFunc("/manga/search", searchManga).Methods("GET")
	api.HandleFunc("/manga/{id}", getMangaDetails).Methods("GET")
	api.HandleFunc("/manga/{id}/chapters", getMangaChapters).Methods("GET")

	// User routes
	api.HandleFunc("/auth/register", registerUser).Methods("POST")
	api.HandleFunc("/auth/login", loginUser).Methods("POST")
	api.HandleFunc("/user/bookmarks", getBookmarks).Methods("GET")
	api.HandleFunc("/user/bookmarks", addBookmark).Methods("POST")
	api.HandleFunc("/user/bookmarks/{id}", deleteBookmark).Methods("DELETE")
	api.HandleFunc("/user/history", getReadingHistory).Methods("GET")
	api.HandleFunc("/user/history", addToHistory).Methods("POST")

	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../frontend")))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, corsObj(r)))
}

// getTopManga fetches top-rated manga from Jikan API
func getTopManga(w http.ResponseWriter, r *http.Request) {
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "12"
	}

	url := fmt.Sprintf("%s/top/manga?limit=%s", jikanBaseURL, limit)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch top manga", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	var jikanResp JikanResponse
	if err := json.Unmarshal(body, &jikanResp); err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jikanResp.Data)
}

// getPopularManga fetches popular manga from Jikan API
func getPopularManga(w http.ResponseWriter, r *http.Request) {
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "12"
	}

	url := fmt.Sprintf("%s/manga?order_by=popularity&sort=asc&limit=%s", jikanBaseURL, limit)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch popular manga", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	var jikanResp JikanResponse
	if err := json.Unmarshal(body, &jikanResp); err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jikanResp.Data)
}

// getLatestManga fetches latest manga from Jikan API
func getLatestManga(w http.ResponseWriter, r *http.Request) {
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "12"
	}

	url := fmt.Sprintf("%s/manga?order_by=start_date&sort=desc&limit=%s", jikanBaseURL, limit)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch latest manga", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	var jikanResp JikanResponse
	if err := json.Unmarshal(body, &jikanResp); err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jikanResp.Data)
}

// searchManga searches for manga based on query parameters
func searchManga(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	genre := r.URL.Query().Get("genre")
	status := r.URL.Query().Get("status")
	limit := r.URL.Query().Get("limit")
	page := r.URL.Query().Get("page")

	if limit == "" {
		limit = "20"
	}
	if page == "" {
		page = "1"
	}

	url := fmt.Sprintf("%s/manga?", jikanBaseURL)

	if query != "" {
		url += fmt.Sprintf("q=%s&", query)
	}
	if genre != "" {
		url += fmt.Sprintf("genres=%s&", genre)
	}
	if status != "" {
		url += fmt.Sprintf("status=%s&", status)
	}

	url += fmt.Sprintf("limit=%s&page=%s", limit, page)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to search manga", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	var jikanResp JikanResponse
	if err := json.Unmarshal(body, &jikanResp); err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jikanResp.Data)
}

// getMangaDetails fetches detailed information about a specific manga
func getMangaDetails(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	url := fmt.Sprintf("%s/manga/%s", jikanBaseURL, id)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch manga details", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	var jikanResp JikanSingleResponse
	if err := json.Unmarshal(body, &jikanResp); err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jikanResp.Data)
}

// getMangaChapters fetches chapters for a specific manga
func getMangaChapters(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	url := fmt.Sprintf("%s/manga/%s/external", jikanBaseURL, id)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch manga chapters", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// registerUser handles user registration
func registerUser(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement actual user registration with MongoDB
	// For now, return success response
	response := map[string]interface{}{
		"success": true,
		"message": "User registered successfully",
		"user": map[string]interface{}{
			"id":       "temp-id",
			"username": user.Username,
			"email":    user.Email,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// loginUser handles user authentication
func loginUser(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement actual user authentication with MongoDB
	// For now, return mock JWT token
	response := map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"token":   "mock-jwt-token",
		"user": map[string]interface{}{
			"id":       "temp-id",
			"username": "testuser",
			"email":    credentials.Email,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getBookmarks fetches user's bookmarks
func getBookmarks(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement actual bookmark fetching from MongoDB
	// For now, return mock bookmarks
	bookmarks := []Bookmark{
		{
			ID:         "1",
			UserID:     "user-1",
			MangaID:    1,
			MangaTitle: "One Piece",
			Chapter:    1,
			Page:       1,
			CreatedAt:  time.Now(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmarks)
}

// addBookmark adds a new bookmark
func addBookmark(w http.ResponseWriter, r *http.Request) {
	var bookmark Bookmark
	if err := json.NewDecoder(r.Body).Decode(&bookmark); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement actual bookmark creation in MongoDB
	bookmark.ID = "new-id"
	bookmark.CreatedAt = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmark)
}

// deleteBookmark removes a bookmark
func deleteBookmark(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	bookmarkID := vars["id"]

	// TODO: Implement actual bookmark deletion from MongoDB
	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Bookmark %s deleted", bookmarkID),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getReadingHistory fetches user's reading history
func getReadingHistory(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement actual reading history fetching from MongoDB
	// For now, return mock history
	history := []ReadingHistory{
		{
			ID:         "1",
			UserID:     "user-1",
			MangaID:    1,
			MangaTitle: "One Piece",
			Chapter:    5,
			Page:       10,
			ReadAt:     time.Now(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// addToHistory adds a reading history entry
func addToHistory(w http.ResponseWriter, r *http.Request) {
	var history ReadingHistory
	if err := json.NewDecoder(r.Body).Decode(&history); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement actual history creation in MongoDB
	history.ID = "new-id"
	history.ReadAt = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// Helper function to convert string to int
func stringToInt(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}
