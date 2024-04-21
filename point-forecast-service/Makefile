# Variables
DOCKER_COMPOSE = docker-compose

# Targets
.PHONY: test

test:
	NODE_ENV=test mocha --inspect

logs:
	 $(DOCKER_COMPOSE) logs -f point-forecast-service

restart:
	$(DOCKER_COMPOSE) restart point-forecast-service

reup:
	$(DOCKER_COMPOSE) build point-forecast-service
	$(DOCKER_COMPOSE) up -d point-forecast-service
