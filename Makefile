VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
DB := etl/data/dynasty.db

.PHONY: all install etl models server dev clean

all: install etl models server

$(VENV)/bin/activate:
	python3.12 -m venv $(VENV)
	$(PIP) install --upgrade pip

install: $(VENV)/bin/activate $(DB)
	$(PIP) install -r etl/requirements.txt
	cd server && npm install

$(DB):
	mkdir -p etl/data
	touch $(DB)

etl: $(VENV)/bin/activate $(DB)
	DATA_DIR=etl/data $(PYTHON) etl/etl_pipeline.py

models: $(VENV)/bin/activate $(DB)
	DATA_DIR=etl/data $(PYTHON) etl/points_model.py
	DATA_DIR=etl/data $(PYTHON) etl/lineup_solver.py --db etl/data/dynasty.db

server: etl models
	cd server && npm start

dev: etl models
	cd server && npm run dev

clean:
	rm -rf $(VENV)
	rm -rf server/node_modules
	rm -f $(DB)
