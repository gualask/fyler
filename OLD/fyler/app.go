package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

type Document struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	Name      string `json:"name"`
	PageCount int    `json:"pageCount"`
	PageSpec  string `json:"pageSpec"`
}

type MergeInput struct {
	Path     string `json:"path"`
	PageSpec string `json:"pageSpec"`
}

type MergeRequest struct {
	Inputs     []MergeInput `json:"inputs"`
	OutputPath string       `json:"outputPath"`
}

func (a *App) OpenPDFsDialog() ([]Document, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Seleziona PDF",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return nil, err
	}

	if len(paths) == 0 {
		return []Document{}, nil
	}

	docs := make([]Document, 0, len(paths))
	for _, p := range paths {
		pc, err := api.PageCountFile(p)
		if err != nil {
			return nil, err
		}
		docs = append(docs, Document{
			ID:        uuid.NewString(),
			Path:      p,
			Name:      filepath.Base(p),
			PageCount: pc,
			PageSpec:  "",
		})
	}

	return docs, nil
}

func (a *App) SavePDFDialog(defaultFilename string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Salva PDF",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

func (a *App) ReadPDFBytes(path string) ([]byte, error) {
	if !isPDFPath(path) {
		return nil, ErrInvalidPDFPath
	}
	return os.ReadFile(path)
}

func (a *App) MergePDFs(req MergeRequest) error {
	return MergePDFs(req)
}
