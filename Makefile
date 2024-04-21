# Variables
DOCKER_COMPOSE = docker-compose

# Targets
.PHONY: build up down logs restart clean

build:
	$(DOCKER_COMPOSE) build

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

logs-all:
	cd docker-elk && $(DOCKER_COMPOSE) logs -f

logs:
	 $(DOCKER_COMPOSE) logs $(filter-out $@,$(MAKECMDGOALS))


restart:
	$(DOCKER_COMPOSE) restart

clean:
	docker ps -q | xargs -r docker stop
	docker system prune -a --volumes -f

reup:
	$(DOCKER_COMPOSE) build $(filter-out $@,$(MAKECMDGOALS))
	$(DOCKER_COMPOSE) up -d $(filter-out $@,$(MAKECMDGOALS))