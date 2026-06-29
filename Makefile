.PHONY: all install etl server dev

all: etl server

install:
	cd etl && pip install -r requirements.txt
	cd server && npm install

etl:
	cd etl && python etl_pipeline.py

server:
	cd server && npm start

dev:
	cd server && npm run dev
