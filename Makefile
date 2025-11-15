.PHONY: test install build dev help commit

test:
	npm run test

install:
	npm install

build:
	npm run build

dev:
	npm run dev

commit:
	@if [ ! -f .commit-msg ]; then \
		echo "Error: .commit-msg file not found"; \
		exit 1; \
	fi
	@echo ""
	@echo "Commit message:"
	@echo "==============="
	@cat .commit-msg
	@echo "==============="
	@echo ""
	@read -p "Approve commit? (y/n) " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		git add -A && git commit -F .commit-msg && rm .commit-msg; \
	else \
		echo "Commit cancelled"; \
		exit 1; \
	fi

help:
	@echo "Available targets:"
	@echo "  make test     - Run tests"
	@echo "  make install  - Install dependencies"
	@echo "  make build    - Build the project"
	@echo "  make dev      - Start development server"
	@echo "  make commit   - Review and approve commit from .commit-msg file"
