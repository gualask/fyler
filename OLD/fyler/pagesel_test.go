package main

import (
	"reflect"
	"testing"
)

func TestParsePageSelection(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    []string
		wantErr bool
	}{
		{name: "empty", in: "", want: nil},
		{name: "single", in: "1", want: []string{"1"}},
		{name: "list", in: "1,3,7", want: []string{"1", "3", "7"}},
		{name: "range", in: "1-5", want: []string{"1-5"}},
		{name: "mixed", in: "1-3,5,8", want: []string{"1-3", "5", "8"}},
		{name: "spaces_invalid", in: "1, 2", wantErr: true},
		{name: "zero_invalid", in: "0", wantErr: true},
		{name: "leading_zero_invalid", in: "01", wantErr: true},
		{name: "empty_token_invalid", in: "1,,2", wantErr: true},
		{name: "open_range_invalid", in: "1-", wantErr: true},
		{name: "reverse_range_invalid", in: "5-1", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParsePageSelection(tt.in)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err=%v wantErr=%v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("got=%v want=%v", got, tt.want)
			}
		})
	}
}
