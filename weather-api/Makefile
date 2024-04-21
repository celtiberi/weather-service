# Variables
DOCKER_COMPOSE = docker-compose

# Targets
.PHONY: test

test:
	NODE_ENV=test mocha --inspect

logs:
	 $(DOCKER_COMPOSE) logs -f weather-api

restart:
	$(DOCKER_COMPOSE) restart weather-api

reup:
	$(DOCKER_COMPOSE) build weather-api
	$(DOCKER_COMPOSE) up -d weather-api
