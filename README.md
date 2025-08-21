# 🗳️ VoteChain - Système de Vote Blockchain Décentralisé

<div align="center">

![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-blue?style=for-the-badge&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-Framework-yellow?style=for-the-badge&logo=ethereum)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)

**Une DApp de vote sécurisée et transparente construite avec Hardhat + Solidity**

*Démocratie numérique • Sécurité blockchain • Open Source*

</div>

---

## 🚀 Démarrage Rapide

### Commandes d'aide
```bash
# Afficher les commandes disponibles
docker-compose run --rm hardhat-dev npx hardhat voting-help

# Afficher les comptes électeurs
docker-compose run --rm hardhat-dev npx hardhat accounts

# verifier un contrat spécifique
docker-compose run --rm hardhat-dev npx hardhat verify-contract --contract ADRESSE --network docker

# voir le vote d'un électeur
docker-compose run --rm hardhat-dev npx hardhat check-vote --contract ADRESSE --address ADRESSE_ELECTEUR --network docker

```

### Installation et Lancement (3 commandes)
```bash
# 1. Démarrer le nœud blockchain
docker-compose up -d hardhat-dev

# 2. Déployer une élection
docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates "Alice,Bob,Carol" --network docker

# 3. Simuler des votes
docker-compose run --rm hardhat-dev npx hardhat simulate --votes 5 --network docker
```

---

## 🎯 Fonctionnalités Principales

| Fonctionnalité | Description | Statut |
|---|---|---|
| **🔐 Vote Unique** | Un électeur = Un vote (protection blockchain) | ✅ |
| **👥 Multi-Comptes** | Support de 20 comptes électeurs différents | ✅ |
| **🏆 Résultats Temps Réel** | Consultation instantanée des votes | ✅ |
| **🎮 Simulation Automatique** | Tests avec votes aléatoires | ✅ |
| **🔍 Diagnostic Avancé** | Outils de vérification et debug | ✅ |
| **🐳 Docker Ready** | Environnement conteneurisé complet | ✅ |

---

## 📋 Commandes Essentielles

### 🗳️ Système de Vote Multi-Comptes

#### Vote avec Compte Spécifique
```bash
# Électeur 1 vote pour le candidat 0
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract CONTRACT_ADDRESS --account 1 --network docker

# Électeur 2 vote pour le candidat 1  
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract CONTRACT_ADDRESS --account 2 --network docker

# Électeur 3 vote pour le candidat 0
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract CONTRACT_ADDRESS --account 3 --network docker
```

#### Vote avec Compte Par Défaut
```bash
# Utilise automatiquement le compte 0 si --account omis
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract CONTRACT_ADDRESS --network docker
```

### 📊 Consultation des Résultats
```bash
# Résultats détaillés avec pourcentages et graphiques
docker-compose run --rm hardhat-dev npx hardhat results --contract CONTRACT_ADDRESS --network docker
```

### 🎮 Simulation Complète
```bash
# Simulation avec 10 électeurs virtuels
docker-compose run --rm hardhat-dev npx hardhat simulate --votes 10 --network docker

# Élection personnalisée avec candidats spécifiques
docker-compose run --rm hardhat-dev npx hardhat simulate --votes 15 --candidates "Jean,Marie,Pierre,Sophie" --network docker
```

---

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 Interface Docker                       │
├─────────────────────────────────────────────────────────────┤
│  📱 Commandes CLI    │  🔧 Hardhat Tasks  │  🎮 Simulation   │
├─────────────────────────────────────────────────────────────┤
│                    ⚡ Hardhat Framework                      │
├─────────────────────────────────────────────────────────────┤
│  📄 Voting.sol      │  🧪 Tests Mocha    │  📜 Scripts      │
├─────────────────────────────────────────────────────────────┤
│                    🔗 Ethereum Virtual Machine              │
├─────────────────────────────────────────────────────────────┤
│  💰 20 Comptes      │  ⛽ Gas Optimisé   │  🔒 Sécurisé     │
└─────────────────────────────────────────────────────────────┘
```

### 🛠️ Stack Technologique
- **Smart Contract** : Solidity 0.8.19 avec optimisations
- **Framework** : Hardhat avec toolbox complet
- **Tests** : Mocha + Chai + Coverage
- **Conteneurisation** : Docker Multi-stage
- **Réseau** : EVM local + Inter-conteneurs
- **Sécurité** : Protection anti-double vote

---

## 📖 Guide d'Utilisation Détaillé

### Scénario : Élection Municipale Simulée

```bash
# 1. 🏛️ Déploiement de l'élection
docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates "Marie Dupont,Jean Martin,Sophie Laurent"

# Exemple de sortie :
# ✅ CONTRAT DÉPLOYÉ AVEC SUCCÈS!
# 📍 Adresse du contrat: 0x5FbDB2315678afecb367f032d93F642f64180aa3

CONTRACT="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# 2. 🗳️ Phase de vote (4 électeurs)
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract $CONTRACT --account 1 --network docker
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract $CONTRACT --account 2 --network docker  
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract $CONTRACT --account 3 --network docker
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 2 --contract $CONTRACT --account 4 --network docker

# 3. 📊 Dépouillement official
docker-compose run --rm hardhat-dev npx hardhat results --contract $CONTRACT --network docker
```

**Résultat Attendu :**
```
📊 RÉSULTATS OFFICIELS DE L'ÉLECTION
═════════════════════════════════════════════════════
📍 Contrat: 0x5FbDB2315678afecb367f032d93F642f64180aa3

🗳️  DÉTAIL DES VOTES
──────────────────────────────
   Marie Dupont: 2 votes
   Jean Martin: 1 votes  
   Sophie Laurent: 1 votes
──────────────────────────────
📈 Total des votes enregistrés: 4

🏆 GAGNANT OFFICIEL
────────────────────
   Marie Dupont avec 2 votes

📊 RÉPARTITION EN POURCENTAGES
───────────────────────────────────────
   Marie Dupont  50.0% ██████████░░░░░░░░░░
   Jean Martin   25.0% █████░░░░░░░░░░░░░░░
   Sophie Laurent 25.0% █████░░░░░░░░░░░░░░░
```

### Test de Sécurité : Tentative de Double Vote

```bash
# 1. Premier vote valide
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract $CONTRACT --account 5 --network docker
# ✅ VOTE ENREGISTRÉ AVEC SUCCÈS!

# 2. Tentative de double vote avec le même compte  
docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract $CONTRACT --account 5 --network docker
# 🚫 VOTE REJETÉ - Électeur déjà enregistré!
# 💡 Protection blockchain : Un électeur = Un vote
```

---

## 🔧 Outils de Diagnostic

### Vérification du Système
```bash
# État général du système
docker-compose run --rm hardhat-dev npx hardhat diagnostic

# Liste des comptes électeurs
docker-compose run --rm hardhat-dev npx hardhat accounts

```

### Vérification des Électeurs
```bash
# Vérifier si une adresse a déjà voté
docker-compose run --rm hardhat-dev npx hardhat check-vote --contract CONTRACT_ADDRESS --address VOTER_ADDRESS --network docker

# Exemple de sortie :
# 🔍 VÉRIFICATION DU STATUT ÉLECTEUR
# ═══════════════════════════════════════════
# 👤 Électeur: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  
# 📍 Contrat: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# 🗳️  Statut: ✅ A déjà voté
```

---

## 🧪 Tests et Qualité

### Suite de Tests Complète
```bash
# Tests unitaires avec couverture
docker-compose run --rm hardhat-test

# Tests spécifiques  
docker-compose run --rm hardhat-dev npx hardhat test --grep "vote"

# Couverture de code
docker-compose run --rm hardhat-dev npx hardhat coverage
```

### Tests de Performance
```bash
# Simulation de charge (50 votes)
docker-compose run --rm hardhat-dev npx hardhat simulate --votes 50 --network docker

# Test de montée en charge avec logs détaillés
docker-compose logs -f hardhat-dev
```

---

## 🔒 Sécurité et Bonnes Pratiques

### 🛡️ Protections Implémentées

| Protection | Description | Implementation |
|---|---|---|
| **Anti-Double Vote** | Mapping `hasVoted` par adresse | ✅ Contrat Solidity |
| **Validation Index** | Vérification bornes candidats | ✅ Modifier `validCandidate` |
| **Audit Trail** | Événements pour chaque vote | ✅ Event `VoteCast` |
| **Gas Optimisation** | Compiler optimisé 200 runs | ✅ hardhat.config.js |
| **Isolation Docker** | Réseau blockchain privé | ✅ docker-compose.yml |

### 🔐 Configuration Sécurisée

#### Comptes de Test Isolés
- **20 comptes** avec 10,000 ETH chacun
- **Mnémonique fixe** pour la reproductibilité  
- **Réseau privé** isolé d'internet

#### Protection Anti-Manipulation
```solidity
// Extrait du contrat Voting.sol
modifier validCandidate(uint candidateIndex) {
    require(candidateIndex < candidateCount, "Invalid candidate");
    _;
}

modifier hasNotVoted() {
    require(!hasVoted[msg.sender], "Already voted");
    _;
}
```
