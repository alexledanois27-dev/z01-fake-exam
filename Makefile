.PHONY: start build test check go-test

start:
	go -C backend run ./cmd/dev

build:
	npm run build

go-test:
	go -C backend test ./...

test:
	npm test
	go -C backend test ./...

check: test
	go -C backend vet ./...
