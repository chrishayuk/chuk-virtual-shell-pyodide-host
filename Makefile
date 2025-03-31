SHELL := /bin/bash

# -------------------------------------------------------------------------
# Project-wide targets
# -------------------------------------------------------------------------

## Install all Node.js dependencies
install:
	@echo "Installing Node.js dependencies..."
	npm install

## Run the Pyodide host (development)
start:
	@echo "Starting the Pyodide host..."
	npm start

## Run tests (if you have them configured)
test:
	@echo "Running tests..."
	npm test

## Remove node_modules and other build artifacts
clean:
	@echo "Removing node_modules and any build artifacts..."
	rm -rf node_modules
	rm -rf dist
	rm -rf .cache

## Build steps (if you have a build process)
build:
	@echo "Building the project..."
	npm run build

## Lint (if you have lint scripts configured)
lint:
	@echo "Linting the project..."
	npm run lint

# -------------------------------------------------------------------------
# Docker-related targets
# -------------------------------------------------------------------------

## Build the Docker image (named chuk-virtual-shell)
docker-build:
	@echo "Building Docker image: chuk-virtual-shell"
	docker build -t chuk-virtual-shell .

## Run the Docker container interactively, removing it after exit
docker-run:
	@echo "Running Docker container chuk-virtual-shell (interactive)..."
	docker run -it --rm chuk-virtual-shell

## Run Docker container with extra flags (example: pass --python-path)
docker-run-sandbox:
	@echo "Running Docker container with sandbox..."
	docker run -it --rm chuk-virtual-shell -- --python-path /app/chuk_virtual_shell --sandbox ai_sandbox

# -------------------------------------------------------------------------
# Declare phony targets to avoid filename conflicts
# -------------------------------------------------------------------------
.PHONY: install start test clean build lint docker-build docker-run docker-run-sandbox