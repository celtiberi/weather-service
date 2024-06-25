# Variables
SERVICES := weather-api weather-web

# Default target
.DEFAULT_GOAL := help

# Targets
.PHONY: build up down logs restart clean dev prod help

build: ## Build all services
	docker compose build

up: ## Start all services in detached mode
	docker compose up -d

dev:
	docker network create weather 2>/dev/null || true
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

prod: ## Start production environment
	docker compose up --build -d

down: ## Stop and remove all containers
	docker compose down

logs: ## View logs of all services or a specific service
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		docker compose logs -f $(filter-out $@,$(MAKECMDGOALS)); \
	else \
		docker compose logs -f; \
	fi

restart: ## Restart all services or a specific service
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		docker compose restart $(filter-out $@,$(MAKECMDGOALS)); \
	else \
		docker compose restart; \
	fi

clean: ## Stop all containers and remove all volumes
	docker ps -aq | xargs -r docker stop
	docker system prune -a --volumes -f

reup: ## Rebuild and restart a specific service
	docker compose build $(filter-out $@,$(MAKECMDGOALS))
	docker compose up -d $(filter-out $@,$(MAKECMDGOALS))

help: ## Display this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# Allow passing arguments to certain targets
%:
	@: