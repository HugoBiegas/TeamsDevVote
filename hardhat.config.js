require("@nomicfoundation/hardhat-toolbox");
const { task } = require("hardhat/config");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  
  // PAS de defaultNetwork défini - Hardhat utilise automatiquement "hardhat"
  
  networks: {
    // Configuration par défaut Hardhat (réseau intégré)
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
      gas: "auto",
      gasPrice: "auto",
      blockGasLimit: 30000000,
    },
    
    // Configuration pour connexion externe au nœud local qui tourne
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 60000,
    },
    
    // Configuration pour Docker (communication inter-conteneurs)
    docker: {
      url: "http://hardhat-dev:8545",
      chainId: 31337,
      timeout: 60000,
    },
    
    // Configuration pour Ganache dans Docker
    ganache: {
      url: "http://ganache:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      },
      chainId: 1337,
      gas: 6721975,
      gasPrice: 20000000000,
      timeout: 60000,
    },
    
    // Configuration pour les réseaux externes
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gas: "auto",
      gasPrice: "auto",
    },
  },
  
  // Configuration des chemins
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  // Configuration Mocha pour les tests avec timeout approprié
  mocha: {
    timeout: 60000,
  },
  
  // Configuration du gas reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  
  // Configuration de Etherscan
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    }
  },
};

// ===============================================
// 🗳️  SYSTÈME DE VOTE MULTI-COMPTES OPTIMISÉ
// ===============================================

// Commande pour voter avec sélection de compte
task("vote", "Vote pour un candidat avec sélection de compte")
  .addParam("candidate", "Index du candidat (0, 1, 2...)")
  .addParam("contract", "Adresse du contrat de vote")
  .addOptionalParam("account", "Index du compte électeur (0-19, défaut: 0)", "0")
  .setAction(async (taskArgs, hre) => {
    const candidateIndex = parseInt(taskArgs.candidate);
    const contractAddress = taskArgs.contract;
    const accountIndex = parseInt(taskArgs.account);
    
    console.log("🗳️  SYSTÈME DE VOTE BLOCKCHAIN");
    console.log("═".repeat(50));
    console.log("📍 Contrat:", contractAddress);
    console.log("🎯 Candidat sélectionné:", candidateIndex);
    console.log("👤 Compte électeur:", accountIndex);
    
    try {
      // 1. VÉRIFICATION : Le contrat existe-t-il ?
      const contractCode = await hre.ethers.provider.getCode(contractAddress);
      if (contractCode === "0x") {
        console.log("\n❌ ERREUR CRITIQUE : Contrat introuvable!");
        console.log("🔧 Solutions recommandées :");
        console.log("   1. Redéployer : docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
        console.log("   2. Vérifier l'adresse du contrat");
        console.log("   3. Redémarrer le nœud : docker-compose restart hardhat-dev");
        return;
      }
      
      // 2. OBTENTION ET VALIDATION DU COMPTE ÉLECTEUR
      const signers = await hre.ethers.getSigners();
      if (accountIndex >= signers.length) {
        console.log(`\n❌ Compte électeur invalide! Utilisez 0-${signers.length-1}`);
        console.log("💡 Comptes disponibles : docker-compose run --rm hardhat-dev npx hardhat accounts");
        return;
      }
      
      const voterSigner = signers[accountIndex];
      const voterAddress = voterSigner.address;
      const balance = await hre.ethers.provider.getBalance(voterAddress);
      
      console.log("\n👤 ÉLECTEUR SÉLECTIONNÉ");
      console.log("─".repeat(30));
      console.log("🔑 Adresse:", voterAddress);
      console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
      
      // 3. VALIDATION DU CONTRAT ET RÉCUPÉRATION DES CANDIDATS
      const voting = await hre.ethers.getContractAt("Voting", contractAddress);
      
      let candidatesList;
      try {
        candidatesList = await voting.getCandidates();
        console.log("\n✅ Contrat validé avec succès!");
        console.log("👥 Candidats disponibles:", candidatesList[0].length);
        
        console.log("\n📋 LISTE DES CANDIDATS");
        console.log("─".repeat(30));
        candidatesList[0].forEach((name, i) => {
          const votes = candidatesList[1][i];
          const isSelected = i === candidateIndex ? "👈 SÉLECTIONNÉ" : "";
          console.log(`   ${i}: ${name} (${votes} votes) ${isSelected}`);
        });
      } catch (error) {
        console.log("\n❌ Erreur lors de la validation du contrat:", error.message);
        console.log("💡 Le contrat existe mais n'est pas compatible avec le système de vote");
        return;
      }
      
      // 4. VALIDATION DE L'INDEX DU CANDIDAT
      const candidateCount = await voting.candidateCount();
      if (candidateIndex >= candidateCount) {
        console.log(`\n❌ Candidat invalide! Utilisez 0-${candidateCount-1}`);
        console.log("💡 Candidats disponibles listés ci-dessus");
        return;
      }
      
      const selectedCandidate = candidatesList[0][candidateIndex];
      
      // 5. VÉRIFICATION DU STATUT DE VOTE
      const hasVoted = await voting.hasVoted(voterAddress);
      if (hasVoted) {
        console.log("\n🚫 VOTE REJETÉ - Électeur déjà enregistré!");
        console.log("📍 Adresse:", voterAddress);
        console.log("💡 Protection blockchain : Un électeur = Un vote");
        console.log("🔄 Utilisez un autre compte : --account 1, --account 2, etc.");
        return;
      }
      
      // 6. EXÉCUTION DU VOTE
      console.log(`\n🗳️  EXÉCUTION DU VOTE POUR "${selectedCandidate}"`);
      console.log("─".repeat(50));
      console.log("⏳ Envoi de la transaction...");
      
      const tx = await voting.connect(voterSigner).vote(candidateIndex);
      console.log("✅ Transaction envoyée:", tx.hash);
      
      console.log("⏳ Attente de confirmation...");
      const receipt = await tx.wait();
      
      // 7. CONFIRMATION ET STATISTIQUES
      console.log("\n🎉 VOTE ENREGISTRÉ AVEC SUCCÈS!");
      console.log("═".repeat(50));
      console.log("📋 Détails de la transaction :");
      console.log("   🆔 Hash:", tx.hash);
      console.log("   🧱 Bloc:", receipt.blockNumber);
      console.log("   ⛽ Gas utilisé:", receipt.gasUsed.toString());
      console.log("   👤 Électeur:", voterAddress);
      console.log("   🎯 Vote pour:", selectedCandidate);
      
      // 8. AFFICHAGE DES RÉSULTATS ACTUALISÉS
      try {
        console.log("\n📊 RÉSULTATS ACTUALISÉS");
        console.log("═".repeat(30));
        const updatedResults = await voting.getCandidates();
        let totalVotes = 0;
        
        updatedResults[0].forEach((name, i) => {
          const votes = Number(updatedResults[1][i]);
          totalVotes += votes;
          const isVoted = i === candidateIndex ? "⭐" : "  ";
          console.log(`${isVoted} ${name}: ${votes} votes`);
        });
        
        console.log("─".repeat(30));
        console.log("📈 Total des votes:", totalVotes);
        
        if (totalVotes > 0) {
          const winner = await voting.getWinner();
          console.log("🏆 Leader actuel:", winner[0], `(${winner[1]} votes)`);
          
          // Pourcentages
          console.log("\n📊 Répartition des votes :");
          updatedResults[0].forEach((name, i) => {
            const votes = Number(updatedResults[1][i]);
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
            console.log(`   ${name}: ${percentage}%`);
          });
        }
        
        console.log("\n💡 Pour voir les résultats complets :");
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract ${contractAddress} --network docker`);
        
      } catch (error) {
        console.log("\n⚠️  Impossible d'afficher les résultats actualisés:", error.message);
        console.log("💡 Consultez manuellement : docker-compose run --rm hardhat-dev npx hardhat results --contract", contractAddress, "--network docker");
      }
      
    } catch (error) {
      console.log("\n❌ ERREUR SYSTÈME:", error.message);
      console.log("🔧 Diagnostic recommandé:");
      console.log("   docker-compose run --rm hardhat-dev npx hardhat verify-contract --contract", contractAddress);
    }
  });

// Commande pour déployer avec candidats personnalisés
task("deploy-voting", "Déploie un contrat de vote avec candidats personnalisés")
  .addOptionalParam("candidates", "Candidats séparés par des virgules", "Alice,Bob,Carol")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    
    if (candidates.length < 2) {
      console.log("❌ Minimum 2 candidats requis pour une élection!");
      return;
    }
    
    console.log("🚀 DÉPLOIEMENT D'UN NOUVEAU CONTRAT DE VOTE");
    console.log("═".repeat(50));
    console.log("👥 Candidats configurés:", candidates.length);
    candidates.forEach((name, i) => console.log(`   ${i}: ${name}`));
    
    try {
      const [deployer] = await hre.ethers.getSigners();
      console.log("\n👤 Déployeur:", deployer.address);
      
      const Voting = await hre.ethers.getContractFactory("Voting");
      const voting = await Voting.deploy(candidates);
      await voting.waitForDeployment();
      
      const address = await voting.getAddress();
      console.log("\n✅ CONTRAT DÉPLOYÉ AVEC SUCCÈS!");
      console.log("📍 Adresse du contrat:", address);
      console.log("🗳️  Système prêt pour les votes!");
      
      // Vérification du déploiement
      const deployedCandidates = await voting.getCandidates();
      console.log("\n📋 Candidats confirmés :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   ${i}: ${name} (0 votes)`);
      });
      
      console.log("\n🎯 COMMANDES DE VOTE DISPONIBLES");
      console.log("═".repeat(50));
      console.log("💡 Vote avec compte par défaut (compte 0) :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate ${i} --contract ${address} --network docker`);
      });
      
      console.log("\n💡 Vote avec comptes spécifiques (comptes 0-19) :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate ${i} --contract ${address} --account ${i+1} --network docker`);
      });
      
      console.log("\n📊 Pour consulter les résultats :");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract ${address} --network docker`);
      
      return address;
    } catch (error) {
      console.log("\n❌ Erreur lors du déploiement:", error.message);
    }
  });

// Commande pour simuler une élection complète
task("simulate", "Simule une élection complète avec votes automatiques")
  .addOptionalParam("votes", "Nombre de votes à simuler", "10")
  .addOptionalParam("candidates", "Candidats personnalisés", "Alice,Bob,Carol")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    const numVotes = parseInt(taskArgs.votes);
    
    console.log("🎮 SIMULATION D'ÉLECTION AUTOMATIQUE");
    console.log("═".repeat(50));
    console.log("👥 Candidats:", candidates.join(", "));
    console.log("📊 Votes simulés:", numVotes);
    
    try {
      // Déploiement automatique
      console.log("\n📦 Déploiement du contrat...");
      const Voting = await hre.ethers.getContractFactory("Voting");
      const voting = await Voting.deploy(candidates);
      await voting.waitForDeployment();
      const address = await voting.getAddress();
      console.log("✅ Contrat déployé à:", address);
      
      // Obtenir des comptes électeurs
      const signers = await hre.ethers.getSigners();
      const availableSigners = Math.min(numVotes, signers.length - 1);
      
      if (availableSigners < numVotes) {
        console.log(`⚠️  Ajustement : ${availableSigners} comptes disponibles (${numVotes} demandés)`);
      }
      
      console.log(`\n🗳️  ${availableSigners} ÉLECTEURS VIRTUELS EN ACTION`);
      console.log("═".repeat(50));
      
      // Votes aléatoires mais réalistes
      const voteDistribution = new Array(candidates.length).fill(0);
      
      for (let i = 0; i < availableSigners; i++) {
        const candidateChoice = Math.floor(Math.random() * candidates.length);
        voteDistribution[candidateChoice]++;
        
        const voterSigner = signers[i + 1]; // +1 pour éviter le déployeur
        await voting.connect(voterSigner).vote(candidateChoice);
        
        console.log(`✅ Électeur ${String(i + 1).padStart(2, '0')}: ${voterSigner.address.slice(0,8)}... → ${candidates[candidateChoice]}`);
        
        // Résultats partiels tous les 5 votes
        if ((i + 1) % 5 === 0 || i === availableSigners - 1) {
          const partial = await voting.getCandidates();
          const partialResults = partial[0].map((name, idx) => `${name}=${partial[1][idx]}`).join(', ');
          console.log(`📊 Après ${i + 1} votes: ${partialResults}`);
        }
      }
      
      // Résultats finaux détaillés
      console.log("\n" + "═".repeat(50));
      console.log("🏆 RÉSULTATS FINAUX DE L'ÉLECTION SIMULÉE");
      console.log("═".repeat(50));
      
      const results = await voting.getCandidates();
      const totalVotes = results[1].reduce((sum, votes) => sum + Number(votes), 0);
      
      results[0].forEach((name, i) => {
        const votes = Number(results[1][i]);
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
        console.log(`📊 ${name.padEnd(15)} ${votes} votes (${percentage}%)`);
      });
      
      const winner = await voting.getWinner();
      console.log(`\n🎉 VAINQUEUR: ${winner[0]} avec ${winner[1]} votes!`);
      console.log(`📍 Contrat de l'élection: ${address}`);

      console.log("\n💡 Pour interagir manuellement avec cette élection et plus visuelle:");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract ${address} --network docker`);

    } catch (error) {
      console.log("\n❌ Erreur lors de la simulation:", error.message);
    }
  });

// Commande pour afficher les résultats détaillés
task("results", "Affiche les résultats détaillés de l'élection")
  .addParam("contract", "Adresse du contrat de vote")
  .setAction(async (taskArgs, hre) => {
    try {
      const voting = await hre.ethers.getContractAt("Voting", taskArgs.contract);
      
      console.log("📊 RÉSULTATS OFFICIELS DE L'ÉLECTION");
      console.log("═".repeat(50));
      console.log("📍 Contrat:", taskArgs.contract);
      
      const results = await voting.getCandidates();
      
      if (results[0].length === 0) {
        console.log("❌ Aucun candidat trouvé dans ce contrat!");
        return;
      }
      
      let totalVotes = 0;
      console.log("\n🗳️  DÉTAIL DES VOTES");
      console.log("─".repeat(30));
      results[0].forEach((name, i) => {
        const votes = Number(results[1][i]);
        totalVotes += votes;
        console.log(`   ${name}: ${votes} votes`);
      });
      
      console.log("─".repeat(30));
      console.log("📈 Total des votes enregistrés:", totalVotes);
      
      if (totalVotes > 0) {
        const winner = await voting.getWinner();
        console.log("\n🏆 GAGNANT OFFICIEL");
        console.log("─".repeat(20));
        console.log(`   ${winner[0]} avec ${winner[1]} votes`);
        
        // Pourcentages détaillés
        console.log("\n📊 RÉPARTITION EN POURCENTAGES");
        console.log("─".repeat(35));
        results[0].forEach((name, i) => {
          const votes = Number(results[1][i]);
          const percentage = ((votes / totalVotes) * 100).toFixed(1);
          const barLength = Math.round((votes / totalVotes) * 20);
          const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
          console.log(`   ${name.padEnd(10)} ${percentage.padStart(5)}% ${bar}`);
        });
      } else {
        console.log("\n📝 Aucun vote enregistré pour le moment");
        console.log("💡 Commencez à voter avec : docker-compose run --rm hardhat-dev npx hardhat vote");
      }
      
    } catch (error) {
      console.log("\n❌ Erreur lors de la lecture des résultats:", error.message);
      console.log("💡 Vérifiez que l'adresse du contrat est correcte");
    }
  });

// Commande pour lister les comptes disponibles
task("accounts", "Affiche la liste des comptes électeurs disponibles")
  .setAction(async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();
    
    console.log("👥 COMPTES ÉLECTEURS DISPONIBLES");
    console.log("═".repeat(50));
    console.log(`📊 Total des comptes : ${accounts.length}`);
    
    console.log("\n🔑 LISTE DES ADRESSES");
    console.log("─".repeat(30));
    for (let i = 0; i < Math.min(accounts.length, 10); i++) {
      const balance = await hre.ethers.provider.getBalance(accounts[i].address);
      const balanceEth = parseFloat(hre.ethers.formatEther(balance)).toFixed(2);
      const status = i === 0 ? "(déployeur)" : "(électeur)";
      console.log(`   ${String(i).padStart(2, '0')}: ${accounts[i].address} - ${balanceEth} ETH ${status}`);
    }
    
    if (accounts.length > 10) {
      console.log(`   ... et ${accounts.length - 10} autres comptes disponibles`);
    }
    
    console.log("\n💡 UTILISATION");
    console.log("─".repeat(15));
    console.log("   Compte par défaut : --account 0 (ou omettez le paramètre)");
    console.log("   Comptes alternatifs : --account 1, --account 2, etc.");
    console.log(`   Plage valide : 0-${accounts.length - 1}`);
  });

// Commande pour vérifier le statut d'un électeur
task("check-vote", "Vérifie si un électeur a déjà voté")
  .addParam("contract", "Adresse du contrat de vote")
  .addParam("address", "Adresse de l'électeur à vérifier")
  .setAction(async (taskArgs, hre) => {
    try {
      const voting = await hre.ethers.getContractAt("Voting", taskArgs.contract);
      const hasVoted = await voting.hasVoted(taskArgs.address);
      
      console.log("🔍 VÉRIFICATION DU STATUT ÉLECTEUR");
      console.log("═".repeat(40));
      console.log("👤 Électeur:", taskArgs.address);
      console.log("📍 Contrat:", taskArgs.contract);
      console.log("🗳️  Statut:", hasVoted ? "✅ A déjà voté" : "📝 Peut encore voter");
      
      if (hasVoted) {
        console.log("\n🚫 Cet électeur a déjà participé à cette élection");
        console.log("💡 Protection blockchain activée : Un électeur = Un vote");
      } else {
        console.log("\n✅ Cet électeur peut voter dans cette élection");
        console.log("💡 Commande de vote :");
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ${taskArgs.contract} --network docker`);
      }
      
    } catch (error) {
      console.log("❌ Erreur lors de la vérification:", error.message);
    }
  });

// Commande pour vérifier l'état d'un contrat
task("verify-contract", "Effectue un diagnostic complet d'un contrat")
  .addParam("contract", "Adresse du contrat à diagnostiquer")
  .setAction(async (taskArgs, hre) => {
    const contractAddress = taskArgs.contract;
    
    console.log("🔍 DIAGNOSTIC COMPLET DU CONTRAT");
    console.log("═".repeat(50));
    console.log("📍 Adresse analysée:", contractAddress);
    
    try {
      // 1. Vérification de base
      console.log("\n1️⃣  Vérification de l'existence...");
      const contractCode = await hre.ethers.provider.getCode(contractAddress);
      
      if (contractCode === "0x") {
        console.log("❌ ÉCHEC : Aucun contrat trouvé à cette adresse");
        console.log("\n🔧 Actions correctives :");
        console.log("   1. Redéployer : docker-compose run --rm hardhat-dev npx hardhat deploy-voting --network docker");
        console.log("   2. Vérifier le nœud : docker-compose ps hardhat-dev");
        console.log("   3. Redémarrer : docker-compose restart hardhat-dev");
        return;
      }
      
      console.log("✅ Contrat trouvé (code déployé)");
      
      // 2. Test des méthodes
      console.log("\n2️⃣  Test des méthodes principales...");
      const voting = await hre.ethers.getContractAt("Voting", contractAddress);
      
      try {
        const candidateCount = await voting.candidateCount();
        const candidates = await voting.getCandidates();
        
        console.log("✅ Interface de vote valide");
        console.log(`📊 Candidats configurés : ${candidateCount}`);
        
        if (candidates[0].length > 0) {
          console.log("\n📋 Liste des candidats :");
          candidates[0].forEach((name, i) => {
            console.log(`   ${i}: ${name} (${candidates[1][i]} votes)`);
          });
        }
        
        // 3. Test du gagnant
        if (candidates[1].some(votes => Number(votes) > 0)) {
          const winner = await voting.getWinner();
          console.log(`\n🏆 Gagnant actuel : ${winner[0]} (${winner[1]} votes)`);
        } else {
          console.log("\n📝 Aucun vote enregistré pour le moment");
        }
        
      } catch (error) {
        console.log("❌ Interface incompatible :", error.message);
        console.log("💡 Ce contrat ne semble pas être un contrat de vote valide");
        return;
      }
      
      // 4. Informations réseau
      console.log("\n3️⃣  Informations réseau...");
      const network = await hre.ethers.provider.getNetwork();
      console.log("🌐 Réseau :", hre.network.name);
      console.log("🔗 Chain ID :", Number(network.chainId));
      
      console.log("\n✅ DIAGNOSTIC TERMINÉ - Contrat opérationnel");
      console.log("💡 Prêt pour les interactions de vote");
      
    } catch (error) {
      console.log("\n❌ ERREUR CRITIQUE :", error.message);
      console.log("🔧 Solutions :");
      console.log("   1. Redémarrer : docker-compose restart hardhat-dev");
      console.log("   2. Logs : docker-compose logs hardhat-dev");
      console.log("   3. Reconstruire : docker-compose down && docker-compose up -d");
    }
  });

// Commande de diagnostic système global
task("diagnostic", "Effectue un diagnostic complet du système")
  .setAction(async (taskArgs, hre) => {
    console.log("🔧 DIAGNOSTIC SYSTÈME COMPLET");
    console.log("═".repeat(50));
    
    try {
      // 1. Test de connectivité
      console.log("1️⃣  Test de connectivité réseau...");
      const provider = hre.ethers.provider;
      const blockNumber = await provider.getBlockNumber();
      console.log("✅ Connexion établie - Bloc actuel :", blockNumber);
      
      // 2. Test des comptes
      console.log("\n2️⃣  Vérification des comptes...");
      const accounts = await hre.ethers.getSigners();
      console.log("✅ Comptes disponibles :", accounts.length);
      const balance = await provider.getBalance(accounts[0].address);
      console.log("💰 Balance du compte principal :", hre.ethers.formatEther(balance), "ETH");
      
      // 3. Test de compilation
      console.log("\n3️⃣  Test de compilation des contrats...");
      try {
        const Voting = await hre.ethers.getContractFactory("Voting");
        console.log("✅ Contrat Voting compilé avec succès");
      } catch (error) {
        console.log("❌ Erreur de compilation :", error.message);
      }
      
      // 4. Informations système
      console.log("\n4️⃣  Configuration système...");
      const network = await provider.getNetwork();
      console.log("🌐 Réseau actuel :", hre.network.name);
      console.log("🔗 Chain ID :", Number(network.chainId));
      console.log("🏗️  Provider :", provider.connection?.url || "intégré");
      
      console.log("\n✅ SYSTÈME OPÉRATIONNEL");
      console.log("🚀 Prêt pour le déploiement et les votes");
      console.log("\n💡 Commande de démarrage rapide :");
      console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --network docker");
      
    } catch (error) {
      console.log("\n❌ PROBLÈME DÉTECTÉ :", error.message);
      console.log("🔧 Solutions :");
      console.log("   1. Redémarrer : docker-compose restart hardhat-dev");
      console.log("   2. Logs : docker-compose logs hardhat-dev");
      console.log("   3. Reconstruction : docker-compose down && docker-compose up -d");
    }
  });

// Commande d'aide complète
task("voting-help", "Guide complet des commandes de vote")
  .setAction(async () => {
    console.log("🗳️  GUIDE COMPLET DU SYSTÈME DE VOTE BLOCKCHAIN");
    console.log("═".repeat(60));
    
    console.log("\n📦 DÉPLOIEMENT D'ÉLECTIONS");
    console.log("─".repeat(30));
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates 'Jean,Marie,Pierre' --network docker");
    
    console.log("\n🗳️  VOTES INDIVIDUELS (avec sélection de compte)");
    console.log("─".repeat(50));
    console.log("   # Vote avec compte par défaut (0)");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ADRESSE --network docker");
    console.log("   ");
    console.log("   # Votes avec comptes spécifiques (multi-électeurs)");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ADRESSE --account 1 --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract ADRESSE --account 2 --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 2 --contract ADRESSE --account 3 --network docker");
    
    console.log("\n📊 CONSULTATION DES RÉSULTATS");
    console.log("─".repeat(35));
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract ADRESSE --network docker");
    
    console.log("\n🎮 SIMULATION AUTOMATIQUE");
    console.log("─".repeat(30));
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate --votes 20 --network docker");
    
    console.log("\n🔍 OUTILS DE DIAGNOSTIC");
    console.log("─".repeat(30));
    console.log("   docker-compose run --rm hardhat-dev npx hardhat accounts");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat diagnostic");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat verify-contract --contract ADRESSE");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat check-vote --contract ADRESSE --address ADRESSE_ELECTEUR");
    
    console.log("\n💡 EXEMPLE COMPLET - ÉLECTION AVEC 4 ÉLECTEURS");
    console.log("═".repeat(55));
    console.log("   # 1. Déployer une élection");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates 'Alice,Bob,Carol' --network docker");
    console.log("   ");
    console.log("   # 2. Quatre personnes votent (utilisez l'adresse retournée)");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract 0x123... --account 1 --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract 0x123... --account 2 --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract 0x123... --account 3 --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 2 --contract 0x123... --account 4 --network docker");
    console.log("   ");
    console.log("   # 3. Consulter les résultats finaux");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract 0x123... --network docker");
    
    console.log("\n🎯 POINTS CLÉS");
    console.log("─".repeat(15));
    console.log("   ✅ Paramètre --account optionnel (défaut: 0)");
    console.log("   ✅ Comptes disponibles : 0-19");
    console.log("   ✅ --network docker obligatoire pour vote et results");
    console.log("   ✅ Protection anti-double vote automatique");
    console.log("   ✅ Index candidats : 0, 1, 2...");
    
    console.log("\n🚀 DÉMARRAGE RAPIDE");
    console.log("─".repeat(20));
    console.log("   docker-compose up -d hardhat-dev");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --network docker");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate --votes 5 --network docker");
  });