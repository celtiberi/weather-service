test:
	ENVIRONMENT=development python -m unittest discover -s tests -p "test_*.py"

run:
	ENVIRONMENT=development python main.py

debug:
	ENVIRONMENT=development python -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 --wait-for-client main.py

test-debug:
	ENVIRONMENT=development python -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m unittest discover -s tests -p "test_*.py"

production:
	ENVIRONMENT=production python main.py