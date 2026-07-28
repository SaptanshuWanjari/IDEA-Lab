.PHONY: setup up down logs test shell-api shell-web

setup:
	docker compose up -d

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

test:
	cd backend && pytest -v

shell-api:
	docker compose exec api bash

shell-web:
	docker compose exec web sh
