package main

import (
	"path/filepath"
	"strings"
)

func isPDFPath(path string) bool {
	return strings.EqualFold(filepath.Ext(path), ".pdf")
}
