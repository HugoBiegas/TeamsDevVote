# Makefile pour simplifier les commandes Docker du projet Voting DApp
.PHONY: help build up down test deploy clean logs shell compile ganache-up ganache-down prod

# Variables
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = voting-dapp

# Aide par défaut
help: ## Affiche cette aide
	@echo "Commandes disponibles pour $(PROJECT_NAME):"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Commandes de build
build: ## Construit les images Docker
	@echo "🔨 Construction des images Docker..."
	docker-compose -f $(COMPOSE_FILE) build

build-no-cache: ## Construit les images Docker sans cache
	@echo "🔨 Construction des images Docker (sans cache)..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache

# Commandes de gestion des services
up: ## Démarre l'environnement de développement
	@echo "🚀 Démarrage de l'environnement de développement..."
	docker-compose -f $(COMPOSE_FILE) up -d hardhat-dev

down: ## Arrête tous les services
	@echo "🛑 Arrêt de tous les services..."
	docker-compose -f $(COMPOSE_FILE) down

restart: down up ## Redémarre l'environnement de développement

# Commandes de test
test: ## Lance les tests
	@echo "🧪 Lancement des tests..."
	docker-compose -f $(COMPOSE_FILE) --profile test run --rm hardhat-test

test-watch: ## Lance les tests en mode watch
	@echo "🧪 Lancement des tests en mode watch..."
	docker-compose -f $(COMPOSE_FILE) --profile test run --rm hardhat-test npx hardhat test --watch

# Compilation des contrats
compile: ## Compile les smart contracts
	@echo "⚙️  Compilation des smart contracts..."
	docker-compose -f $(COMPOSE_FILE) run --rm hardhat-dev npx hardhat compile

clean-compile: ## Nettoie et recompile les contrats
	@echo "🧹 Nettoyage et recompilation..."
	docker-compose -f $(COMPOSE_FILE) run --rm hardhat-dev npx hardhat clean
	docker-compose -f $(COMPOSE_FILE) run --rm hardhat-dev npx hardhat compile

# Déploiement
deploy: ## Déploie les contrats sur le réseau local
	@echo "📦 Déploiement des contrats..."
	docker-compose -f $(COMPOSE_FILE) --profile deploy run --rm hardhat-deploy

# Ganache (environnement alternatif)
ganache-up: ## Démarre Ganache
	@echo "🦘 Démarrage de Ganache..."
	docker-compose -f $(COMPOSE_FILE) --profile ganache up -d ganache

ganache-down: ## Arrête Ganache
	@echo "🛑 Arrêt de Ganache..."
	docker-compose -f $(COMPOSE_FILE) --profile ganache down

# Production
prod: ## Démarre l'environnement de production
	@echo "🏭 Démarrage en mode production..."
	docker-compose -f $(COMPOSE_FILE) --profile production up -d hardhat-prod

# Commandes utilitaires
logs: ## Affiche les logs du service principal
	@echo "📋 Affichage des logs..."
	docker-compose -f $(COMPOSE_FILE) logs -f hardhat-dev

logs-all: ## Affiche les logs de tous les services
	@echo "📋 Affichage de tous les logs..."
	docker-compose -f $(COMPOSE_FILE) logs -f

shell: ## Ouvre un shell dans le conteneur de développement
	@echo "🐚 Ouverture d'un shell..."
	docker-compose -f $(COMPOSE_FILE) exec hardhat-dev sh

shell-new: ## Ouvre un nouveau shell dans un conteneur temporaire
	@echo "🐚 Ouverture d'un nouveau shell..."
	docker-compose -f $(COMPOSE_FILE) run --rm hardhat-dev sh

# Commandes de nettoyage
clean: ## Nettoie les conteneurs et volumes
	@echo "🧹 Nettoyage des conteneurs et volumes..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f

clean-all: ## Nettoyage complet (images, conteneurs, volumes)
	@echo "🧹 Nettoyage complet..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans --rmi all
	docker system prune -a -f --volumes

# Commandes de développement
dev-setup: build up compile ## Configuration complète pour le développement
	@echo "✅ Environnement de développement prêt!"

dev-full-cycle: clean build up compile test deploy ## Cycle complet de développement
	@echo "✅ Cycle complet terminé!"

# Commandes d'information
status: ## Affiche le statut des conteneurs
	@echo "📊 Statut des conteneurs:"
	docker-compose -f $(COMPOSE_FILE) ps

network-info: ## Affiche les informations réseau
	@echo "🌐 Informations réseau:"
	docker network ls | grep blockchain

# Commandes de correction rapide
fix-node-version: ## Corrige la version Node.js et reconstruit
	@echo "🔧 Correction de la version Node.js..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d hardhat-dev

fix-hardhat-config: ## Applique la configuration Hardhat corrigée
	@echo "⚙️  Application de la configuration Hardhat corrigée..."
	@if [ -f "hardhat.config.js" ]; then cp hardhat.config.js hardhat.config.js.backup; fi
	@cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");
module.exports = {
  solidity: { version: "0.8.19", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hardhat: { chainId: 31337, accounts: { mnemonic: "test test test test test test test test test test test junk", count: 20, accountsBalance: "10000000000000000000000" } },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    docker: { url: "http://hardhat-dev:8545", chainId: 31337 }
  },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
  mocha: { timeout: 60000 }
};
EOF
	@echo "✅ Configuration Hardhat mise à jour"

fix-all: fix-hardhat-config clean build up ## Correction complète de tous les problèmes
	@echo "🎉 Corrections appliquées avec succès!"

quick-fix: ## Correction rapide des erreurs courantes
	@echo "⚡ Correction rapide en cours..."
	make fix-hardhat-config
	make down
	make up
	@echo "✅ Correction rapide terminée"

# Commandes de sécurité
security-scan: ## Lance un scan de sécurité avec docker-bench
	@echo "🔒 Scan de sécurité..."
	docker run --rm -it --net host --pid host --userns host --cap-add audit_control \
		-v /etc:/etc:ro \
		-v /usr/bin/docker-containerd:/usr/bin/docker-containerd:ro \
		-v /usr/bin/docker-runc:/usr/bin/docker-runc:ro \
		-v /usr/lib/systemd:/usr/lib/systemd:ro \
		-v /var/lib:/var/lib:ro \
		-v /var/run/docker.sock:/var/run/docker.sock:ro \
		--label docker_bench_security \
		docker/docker-bench-security