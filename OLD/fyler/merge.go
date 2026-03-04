package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

func MergePDFs(req MergeRequest) error {
	if len(req.Inputs) == 0 {
		return ErrMissingMergeInputs
	}
	if req.OutputPath == "" {
		return ErrMissingOutputPath
	}

	conf := model.NewDefaultConfiguration()

	var (
		inFiles   []string
		tmpFiles  []string
		createdAt = make(map[string]int)
	)
	defer func() {
		for _, tmp := range tmpFiles {
			_ = os.Remove(tmp)
		}
	}()

	for _, input := range req.Inputs {
		if !isPDFPath(input.Path) {
			return fmt.Errorf("%w: %s", ErrInvalidPDFPath, input.Path)
		}

		selectedPages, err := ParsePageSelection(input.PageSpec)
		if err != nil {
			return fmt.Errorf("%s: %w", filepath.Base(input.Path), err)
		}

		if len(selectedPages) == 0 {
			inFiles = append(inFiles, input.Path)
			continue
		}

		base := filepath.Base(input.Path)
		createdAt[base]++
		tmp, err := os.CreateTemp("", fmt.Sprintf("fyler-%s-%d-*.pdf", base, createdAt[base]))
		if err != nil {
			return err
		}
		tmpPath := tmp.Name()
		if err := tmp.Close(); err != nil {
			_ = os.Remove(tmpPath)
			return err
		}
		tmpFiles = append(tmpFiles, tmpPath)

		if err := api.TrimFile(input.Path, tmpPath, selectedPages, conf); err != nil {
			return err
		}

		inFiles = append(inFiles, tmpPath)
	}

	if err := os.MkdirAll(filepath.Dir(req.OutputPath), 0o755); err != nil {
		return err
	}
	if _, err := os.Stat(req.OutputPath); err == nil {
		if err := os.Remove(req.OutputPath); err != nil {
			return err
		}
	}

	return api.MergeCreateFile(inFiles, req.OutputPath, false, conf)
}
