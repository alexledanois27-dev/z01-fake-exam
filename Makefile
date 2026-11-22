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
	python3 -m unittest discover -s tests -p 'test_launcher*.py'
	go -C backend vet ./...
