VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
DB := etl/data/dynasty.db

.PHONY: all install etl models server dev dashboard-test dashboard-e2e clean

all: install etl models server

$(VENV)/bin/activate:
	python3.12 -m venv $(VENV)
	$(PIP) install --upgrade pip

install: $(VENV)/bin/activate $(DB)
	$(PIP) install -r etl/requirements.txt
	cd dashboard && npm install

$(DB):
	mkdir -p etl/data
	touch $(DB)

etl: $(VENV)/bin/activate $(DB)
	DATA_DIR=etl/data $(PYTHON) etl/etl_pipeline.py

models: $(VENV)/bin/activate $(DB)
	DATA_DIR=etl/data $(PYTHON) etl/points_model.py
	DATA_DIR=etl/data $(PYTHON) etl/lineup_solver.py --db etl/data/dynasty.db
	$(PYTHON) etl/dp_archive_etl.py --db etl/data/dynasty.db --since 2019-01-01
	$(PYTHON) etl/outcomes_etl.py --db etl/data/dynasty.db --seasons 2019 2025 --seed-fc
	$(PYTHON) etl/project_production.py --db etl/data/dynasty.db
	$(PYTHON) etl/cornering_metrics.py --db etl/data/dynasty.db

server: etl models
	cd dashboard && npm run dev -- --port 3000

dev: etl models
	cd dashboard && npm run dev -- --port 3000

dashboard-test:
	cd dashboard && npx vitest run

dashboard-e2e:
	cd dashboard && npx playwright test

clean:
	rm -rf $(VENV)
	rm -rf dashboard/node_modules dashboard/.svelte-kit
	rm -f $(DB)
