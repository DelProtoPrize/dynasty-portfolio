VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
DB := etl/data/dynasty.db

.PHONY: all install pipeline pipeline-csv seed server dev test test-etl test-e2e clean

all: install pipeline server

$(VENV)/bin/activate:
	python3.12 -m venv $(VENV)
	$(PIP) install --upgrade pip

install: $(VENV)/bin/activate $(DB)
	$(PIP) install -r etl/requirements.txt
	cd dashboard && npm install

$(DB):
	mkdir -p etl/data
	touch $(DB)

# --- ETL v2 orchestrator (preferred) ---
pipeline: $(VENV)/bin/activate $(DB)
	$(PYTHON) -m etl_v2.run --output db

pipeline-csv: $(VENV)/bin/activate $(DB)
	$(PYTHON) -m etl_v2.run --output csv

seed: $(VENV)/bin/activate $(DB)
	$(PYTHON) -m etl_v2.run --input csv


# --- Server ---
server: pipeline
	cd dashboard && npm run dev -- --port 3000

dev: pipeline
	cd dashboard && npm run dev -- --port 3000

# --- Tests ---
test:
	$(PYTHON) -m pytest etl_v2/tests/ -v
	cd dashboard && npx vitest run

test-etl:
	$(PYTHON) -m pytest etl_v2/tests/ -v --cov=etl_v2

test-e2e:
	cd dashboard && npx playwright test

clean:
	rm -rf $(VENV)
	rm -rf dashboard/node_modules dashboard/.svelte-kit
	rm -f $(DB)
