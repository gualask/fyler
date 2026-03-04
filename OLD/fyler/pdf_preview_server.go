package main

import (
	"net/http"
	"os"
	"path/filepath"
)

const pdfPreviewRoute = "/_fyler/pdf"

func pdfPreviewMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != pdfPreviewRoute {
			next.ServeHTTP(w, r)
			return
		}

		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		p := r.URL.Query().Get("path")
		if p == "" {
			http.Error(w, "missing path", http.StatusBadRequest)
			return
		}
		if !filepath.IsAbs(p) || !isPDFPath(p) {
			http.Error(w, "invalid path", http.StatusBadRequest)
			return
		}

		f, err := os.Open(p)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()

		st, err := f.Stat()
		if err != nil || st.IsDir() {
			http.NotFound(w, r)
			return
		}

		h := w.Header()
		h.Set("Content-Type", "application/pdf")
		h.Set("Cache-Control", "no-store")
		h.Set("X-Content-Type-Options", "nosniff")
		http.ServeContent(w, r, filepath.Base(p), st.ModTime(), f)
	})
}

