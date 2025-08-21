# Voting DApp (Hardhat + Solidity)

Petit projet de système de vote sur blockchain pour un devoir pratique.

Structure:

- `contracts/Voting.sol` : smart contract principal.
- `test/voting.test.js` : tests unitaires (Hardhat/Mocha/Chai).
- `scripts/deploy.js` : script de déploiement local.

Prérequis : Node.js, npm

Installation et tests :

```
cd /Users/naierabassi/Documents/TeamsDev
npm install
npx hardhat test
```

Résumé :

- Chaque électeur (adresse) peut voter une seule fois.
- Les votes sont comptés on-chain.
- Les résultats sont consultables via `getCandidates()` et `getWinner()`.

A faire dans l'équipe : lister qui a fait quoi (à compléter par l'équipe).
