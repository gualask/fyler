package main

import "errors"

var (
	ErrInvalidPDFPath     = errors.New("invalid PDF path")
	ErrMissingMergeInputs = errors.New("missing merge inputs")
	ErrMissingOutputPath  = errors.New("missing output path")
)
