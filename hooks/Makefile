PREFIX := $(HOME)/.local
BIN    := $(PREFIX)/bin/hooks-server
SCRIPT := $(PREFIX)/bin/hooks-dispatch
CONF   := $(HOME)/.config/claude-hooks
CACHE  := $(HOME)/.cache/claude-hooks

.PHONY: all install uninstall clean

all:
	cargo build --release

install: all
	@mkdir -p $(PREFIX)/bin $(CONF) $(CACHE)
	cp target/release/hooks-server $(BIN)
	cp scripts/hooks-dispatch $(SCRIPT)
	@chmod +x $(BIN) $(SCRIPT)
	@test -f $(CONF)/config.json || cp config.example.json $(CONF)/config.json
	@test -f $(HOME)/.env || echo '# DEEPSEEK_API_KEY=sk-your-key-here' > $(HOME)/.env
	@echo ""
	@echo "═══════════════════════════════════════════════════"
	@echo "  Installed:"
	@echo "    $(BIN)"
	@echo "    $(SCRIPT)"
	@echo "═══════════════════════════════════════════════════"
	@echo ""
	@echo "  1. echo 'DEEPSEEK_API_KEY=sk-...' >> ~/.env"
	@echo "  2. Hooks auto-start on SessionStart via .claude/settings.json"
	@echo ""

uninstall:
	rm -f $(BIN) $(SCRIPT)
	rm -f $(CACHE)/server.pid $(CACHE)/server.log
	@echo "Binaries removed. Config at $(CONF) preserved."

clean:
	cargo clean
