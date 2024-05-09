# Variables
DOCKER_COMPOSE = docker-compose

# Targets
.PHONY: test

test:
	NODE_ENV=test mocha --inspect

logs:
	 $(DOCKER_COMPOSE) logs -f nws-forecast-service

restart:
	$(DOCKER_COMPOSE) restart nws-forecast-service

reup:
	$(DOCKER_COMPOSE) build nws-forecast-service
	$(DOCKER_COMPOSE) up -d nws-forecast-service
