package main

import (
	"fmt"
	"strconv"
	"strings"
)

func ParsePageSelection(spec string) ([]string, error) {
	if spec == "" {
		return nil, nil
	}

	if strings.ContainsAny(spec, " \t\n\r") {
		return nil, fmt.Errorf("invalid page selection: spaces are not allowed")
	}

	parts := strings.Split(spec, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		if part == "" {
			return nil, fmt.Errorf("invalid page selection: empty token")
		}

		if strings.Count(part, "-") == 0 {
			n, err := parsePageNumber(part)
			if err != nil {
				return nil, err
			}
			out = append(out, strconv.Itoa(n))
			continue
		}

		if strings.Count(part, "-") != 1 {
			return nil, fmt.Errorf("invalid page selection: %q", part)
		}

		startStr, endStr, ok := strings.Cut(part, "-")
		if !ok || startStr == "" || endStr == "" {
			return nil, fmt.Errorf("invalid page range: %q", part)
		}
		start, err := parsePageNumber(startStr)
		if err != nil {
			return nil, err
		}
		end, err := parsePageNumber(endStr)
		if err != nil {
			return nil, err
		}
		if start > end {
			return nil, fmt.Errorf("invalid page range: %q", part)
		}
		out = append(out, fmt.Sprintf("%d-%d", start, end))
	}

	return out, nil
}

func parsePageNumber(s string) (int, error) {
	if s == "" {
		return 0, fmt.Errorf("invalid page number")
	}
	if len(s) > 1 && s[0] == '0' {
		return 0, fmt.Errorf("invalid page number: %q", s)
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("invalid page number: %q", s)
	}
	return n, nil
}
