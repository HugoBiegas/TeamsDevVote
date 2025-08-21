# Multi-stage build pour optimiser la taille de l'image
FROM node:20-alpine AS base

# Installation des dépendances système nécessaires pour les modules natifs
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S hardhat && \
    adduser -S hardhat -u 1001 -G hardhat

# Mise à jour npm pour supprimer les warnings et configuration
RUN npm install -g npm@latest && \
    npm config set fund false && \
    npm config set audit false && \
    npm config set update-notifier false && \
    echo 'Warnings npm supprimés'

WORKDIR /app

# Stage de build des dépendances
FROM base AS deps

# Copie des fichiers de configuration des dépendances
COPY package*.json ./

# Installation des dépendances avec cache optimisé
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Stage de développement
FROM base AS dev

# Copie des dépendances depuis le stage précédent
COPY --from=deps /app/node_modules ./node_modules

# Copie du code source
COPY --chown=hardhat:hardhat . .

# Installation des dépendances de développement
RUN npm ci --silent

# Changement vers l'utilisateur non-root
USER hardhat

# Exposition du port Hardhat par défaut
EXPOSE 8545

# Commande par défaut pour le mode développement
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0", "--port", "8545"]

# Stage de production
FROM base AS prod

# Copie des dépendances de production uniquement
COPY --from=deps /app/node_modules ./node_modules

# Copie du code source
COPY --chown=hardhat:hardhat . .

# Changement vers l'utilisateur non-root
USER hardhat

# Health check pour vérifier que le nœud Hardhat fonctionne
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8545 || exit 1

# Exposition du port
EXPOSE 8545

# Commande par défaut pour la production
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0", "--port", "8545"]