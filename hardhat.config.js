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
// COMMANDES PRÉFAITES POUR VOTER
// ===============================================

// Commande pour voter rapidement
task("vote", "Vote pour un candidat avec vérifications")
  .addParam("candidate", "Index du candidat")
  .addParam("contract", "Adresse du contrat")
  .setAction(async (taskArgs, hre) => {
    const candidateIndex = parseInt(taskArgs.candidate);
    const contractAddress = taskArgs.contract;
    
    console.log("🗳️  Tentative de vote...");
    console.log("📍 Contrat:", contractAddress);
    console.log("👤 Candidat:", candidateIndex);
    
    try {
      // 1. VÉRIFICATION : Le contrat existe-t-il ?
      const contractCode = await hre.ethers.provider.getCode(contractAddress);
      if (contractCode === "0x") {
        console.log("❌ ERREUR : Aucun contrat trouvé à cette adresse!");
        console.log("💡 Solutions :");
        console.log("   1. Redéployez : docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
        console.log("   2. Vérifiez l'adresse du contrat");
        console.log("   3. Relancez le nœud : docker-compose restart hardhat-dev");
        return;
      }
      
      // 2. VÉRIFICATION : Le contrat a-t-il la méthode getCandidates ?
      const voting = await hre.ethers.getContractAt("Voting", contractAddress);
      
      try {
        const testCandidates = await voting.getCandidates();
        console.log("✅ Contrat valide trouvé!");
        console.log("👥 Candidats disponibles:", testCandidates[0].length);
        testCandidates[0].forEach((name, i) => {
          console.log(`   ${i}: ${name} (${testCandidates[1][i]} votes)`);
        });
      } catch (error) {
        console.log("❌ Erreur lors de la lecture des candidats:", error.message);
        console.log("💡 Le contrat existe mais n'est pas compatible");
        return;
      }
      
      // 3. VÉRIFICATION : Index de candidat valide ?
      const candidateCount = await voting.candidateCount();
      if (candidateIndex >= candidateCount) {
        console.log(`❌ Index de candidat invalide! (0-${candidateCount-1})`);
        return;
      }
      
      // 4. VÉRIFICATION : L'électeur a-t-il déjà voté ?
      const [signer] = await hre.ethers.getSigners();
      const hasVoted = await voting.hasVoted(signer.address);
      if (hasVoted) {
        console.log("❌ Cette adresse a déjà voté!");
        console.log("👤 Électeur:", signer.address);
        return;
      }
      
      // 5. VOTE
      console.log(`\n🗳️  Vote pour le candidat ${candidateIndex}...`);
      const tx = await voting.vote(candidateIndex);
      console.log("⏳ Transaction envoyée:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Vote enregistré!");
      console.log("📍 Transaction:", tx.hash);
      console.log("🧱 Bloc:", receipt.blockNumber);
      console.log("⛽ Gas utilisé:", receipt.gasUsed.toString());
      
      // 6. AFFICHAGE DES RÉSULTATS ACTUELS avec nouvelle vérification
      try {
        console.log("\n📊 Résultats actuels:");
        const results = await voting.getCandidates();
        let totalVotes = 0;
        
        results[0].forEach((name, i) => {
          const votes = Number(results[1][i]);
          totalVotes += votes;
          console.log(`   ${name}: ${votes} votes`);
        });
        
        if (totalVotes > 0) {
          const winner = await voting.getWinner();
          console.log(`\n🏆 Gagnant actuel: ${winner[0]} (${winner[1]} votes)`);
          
          // Pourcentages
          console.log("\n📊 Pourcentages:");
          results[0].forEach((name, i) => {
            const votes = Number(results[1][i]);
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
            console.log(`   ${name}: ${percentage}%`);
          });
        }
      } catch (error) {
        console.log("⚠️  Impossible d'afficher les résultats post-vote:", error.message);
        console.log("💡 Réessayez avec : docker-compose run --rm hardhat-dev npx hardhat results --contract", contractAddress);
      }
      
    } catch (error) {
      console.log("❌ Erreur lors du vote:", error.message);
      console.log("💡 Diagnostic recommandé:");
      console.log("   docker-compose run --rm hardhat-dev npx hardhat verify-contract --contract", contractAddress);
    }
  });

// Nouvelle tâche pour vérifier l'état d'un contrat
task("verify-contract", "Vérifie l'état et la validité d'un contrat")
  .addParam("contract", "Adresse du contrat à vérifier")
  .setAction(async (taskArgs, hre) => {
    const contractAddress = taskArgs.contract;
    
    console.log("🔍 Vérification du contrat...");
    console.log("📍 Adresse:", contractAddress);
    
    try {
      // Vérification de base
      const contractCode = await hre.ethers.provider.getCode(contractAddress);
      
      if (contractCode === "0x") {
        console.log("❌ Aucun contrat trouvé à cette adresse");
        console.log("💡 Actions possibles :");
        console.log("   1. Redéployer : docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
        console.log("   2. Vérifier le statut du nœud : docker-compose ps");
        console.log("   3. Voir les logs : docker-compose logs hardhat-dev");
        return;
      }
      
      console.log("✅ Contrat trouvé");
      console.log("📏 Taille du bytecode:", contractCode.length, "caractères");
      
      // Test des méthodes du contrat Voting
      try {
        const voting = await hre.ethers.getContractAt("Voting", contractAddress);
        
        // Test getCandidates
        const candidates = await voting.getCandidates();
        console.log("✅ Méthode getCandidates() fonctionne");
        console.log("👥 Candidats:", candidates[0]);
        console.log("🗳️  Votes:", candidates[1].map(v => Number(v)));
        
        // Test candidateCount
        const count = await voting.candidateCount();
        console.log("✅ Méthode candidateCount() fonctionne:", Number(count));
        
        // Test getWinner
        try {
          const winner = await voting.getWinner();
          console.log("✅ Méthode getWinner() fonctionne");
          console.log("🏆 Gagnant actuel:", winner[0], "avec", Number(winner[1]), "votes");
        } catch (error) {
          console.log("⚠️  getWinner() échoue (normal si aucun candidat):", error.message);
        }
        
        // Informations sur le réseau
        const network = await hre.ethers.provider.getNetwork();
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        
        console.log("\n🌐 Informations réseau:");
        console.log("   Chain ID:", Number(network.chainId));
        console.log("   Nom:", network.name);
        console.log("   Bloc actuel:", blockNumber);
        
        console.log("\n✅ Le contrat est entièrement fonctionnel!");
        
      } catch (error) {
        console.log("❌ Erreur lors du test des méthodes:", error.message);
        console.log("💡 Le contrat existe mais n'est pas compatible avec l'interface Voting");
      }
      
    } catch (error) {
      console.log("❌ Erreur lors de la vérification:", error.message);
    }
  });

task("diagnose", "Diagnostic complet des problèmes courants")
  .setAction(async (taskArgs, hre) => {
    console.log("🏥 DIAGNOSTIC SYSTÈME COMPLET");
    console.log("=" * 50);
    
    try {
      // 1. Test de connectivité réseau
      console.log("\n1️⃣  Test de connectivité...");
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log("✅ Connexion réseau OK - Bloc:", blockNumber);
      
      // 2. Test des comptes
      console.log("\n2️⃣  Test des comptes...");
      const accounts = await hre.ethers.getSigners();
      console.log("✅ Comptes disponibles:", accounts.length);
      const balance = await hre.ethers.provider.getBalance(accounts[0].address);
      console.log("💰 Balance du premier compte:", hre.ethers.formatEther(balance), "ETH");
      
      // 3. Test de compilation
      console.log("\n3️⃣  Test de compilation...");
      try {
        const Voting = await hre.ethers.getContractFactory("Voting");
        console.log("✅ Contrat Voting compilé avec succès");
      } catch (error) {
        console.log("❌ Erreur de compilation:", error.message);
      }
      
      // 4. Informations réseau
      console.log("\n4️⃣  Informations réseau...");
      const network = await hre.ethers.provider.getNetwork();
      console.log("🌐 Réseau:", hre.network.name);
      console.log("🔗 Chain ID:", Number(network.chainId));
      console.log("🏗️  Provider:", hre.ethers.provider.connection?.url || "intégré");
      
      console.log("\n✅ DIAGNOSTIC TERMINÉ - Système opérationnel");
      console.log("💡 Pour déployer un nouveau contrat :");
      console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
      
    } catch (error) {
      console.log("❌ PROBLÈME DÉTECTÉ:", error.message);
      console.log("💡 Solutions :");
      console.log("   1. Redémarrer le nœud : docker-compose restart hardhat-dev");
      console.log("   2. Vérifier les logs : docker-compose logs hardhat-dev");
      console.log("   3. Reconstruire : docker-compose down && docker-compose up -d");
    }
  });
  
// Commande pour voir les résultats
task("results", "Affiche les résultats de vote")
  .addParam("contract", "Adresse du contrat")
  .setAction(async (taskArgs, hre) => {
    try {
      const voting = await hre.ethers.getContractAt("Voting", taskArgs.contract);
      
      console.log("📊 Résultats de l'élection:");
      console.log("📍 Contrat:", taskArgs.contract);
      
      const results = await voting.getCandidates();
      
      if (results[0].length === 0) {
        console.log("❌ Aucun candidat trouvé!");
        return;
      }
      
      let totalVotes = 0;
      results[0].forEach((name, i) => {
        const votes = Number(results[1][i]);
        totalVotes += votes;
        console.log(`   ${name}: ${votes} votes`);
      });
      
      console.log(`\n📈 Total des votes: ${totalVotes}`);
      
      const winner = await voting.getWinner();
      console.log(`\n🏆 Gagnant: ${winner[0]} avec ${winner[1]} votes`);
      
      // Pourcentages
      if (totalVotes > 0) {
        console.log("\n📊 Pourcentages:");
        results[0].forEach((name, i) => {
          const votes = Number(results[1][i]);
          const percentage = ((votes / totalVotes) * 100).toFixed(1);
          console.log(`   ${name}: ${percentage}%`);
        });
      }
      
    } catch (error) {
      console.log("❌ Erreur lors de la lecture des résultats:", error.message);
      console.log("💡 Vérifiez que l'adresse du contrat est correcte");
    }
  });

// Commande pour déployer avec candidats personnalisés
task("deploy-voting", "Déploie un contrat de vote")
  .addOptionalParam("candidates", "Candidats séparés par des virgules", "Alice,Bob,Carol")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    
    if (candidates.length < 2) {
      console.log("❌ Il faut au moins 2 candidats!");
      return;
    }
    
    console.log("📦 Déploiement du contrat de vote...");
    console.log("👥 Candidats:", candidates);
    
    try {
      const [deployer] = await hre.ethers.getSigners();
      console.log("👤 Déployeur:", deployer.address);
      
      const Voting = await hre.ethers.getContractFactory("Voting");
      const voting = await Voting.deploy(candidates);
      await voting.waitForDeployment();
      
      const address = await voting.getAddress();
      console.log("✅ Contrat déployé à:", address);
      console.log("🗳️  Prêt pour le vote!");
      
      // Vérification
      const deployedCandidates = await voting.getCandidates();
      console.log("\n📋 Candidats confirmés:");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   ${i}: ${name}`);
      });
      
      console.log("\n💡 Pour voter utilisez:");
      console.log("🐳 Avec Docker Compose (depuis votre machine) :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate ${i} --contract ${address}  --network docker # ${name}`);
      });
      
      console.log("\n⚡ Ou directement dans un conteneur :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   npx hardhat vote --candidate ${i} --contract ${address}  # ${name}`);
      });
      
      console.log("\n📊 Pour voir les résultats :");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract --network docker ${address}`);
      
      return address;
    } catch (error) {
      console.log("❌ Erreur lors du déploiement:", error.message);
    }
  });

// Commande pour simuler une élection complète
task("simulate", "Simule une élection complète")
  .addOptionalParam("votes", "Nombre de votes à simuler", "10")
  .addOptionalParam("candidates", "Candidats personnalisés", "Alice,Bob,Carol")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    const numVotes = parseInt(taskArgs.votes);
    
    console.log("🗳️  Simulation d'élection...");
    console.log("👥 Candidats:", candidates);
    console.log("📊 Nombre de votes:", numVotes);
    
    try {
      // Déploiement
      const Voting = await hre.ethers.getContractFactory("Voting");
      const voting = await Voting.deploy(candidates);
      await voting.waitForDeployment();
      const address = await voting.getAddress();
      console.log("📍 Contrat:", address);
      
      // Obtenir des comptes
      const signers = await hre.ethers.getSigners();
      const availableSigners = Math.min(numVotes, signers.length - 1);
      
      if (availableSigners < numVotes) {
        console.log(`⚠️  Seulement ${availableSigners} comptes disponibles, simulation ajustée`);
      }
      
      console.log(`\n👥 ${availableSigners} électeurs vont voter...\n`);
      
      // Votes aléatoires mais réalistes
      const voteDistribution = new Array(candidates.length).fill(0);
      
      for (let i = 0; i < availableSigners; i++) {
        const candidateChoice = Math.floor(Math.random() * candidates.length);
        voteDistribution[candidateChoice]++;
        
        await voting.connect(signers[i + 1]).vote(candidateChoice);
        console.log(`✅ Électeur ${i + 1} vote pour ${candidates[candidateChoice]}`);
        
        // Résultats partiels tous les 5 votes
        if ((i + 1) % 5 === 0 || i === availableSigners - 1) {
          const partial = await voting.getCandidates();
          console.log(`📊 Après ${i + 1} votes:`, 
            partial[0].map((name, idx) => `${name}=${partial[1][idx]}`).join(', '));
        }
      }
      
      // Résultats finaux détaillés
      console.log("\n" + "=".repeat(50));
      console.log("🏆 RÉSULTATS FINAUX DE L'ÉLECTION");
      console.log("=".repeat(50));
      
      const results = await voting.getCandidates();
      const totalVotes = results[1].reduce((sum, votes) => sum + Number(votes), 0);
      
      results[0].forEach((name, i) => {
        const votes = Number(results[1][i]);
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
        console.log(`📊 ${name.padEnd(15)} ${votes} votes (${percentage}%)`);
      });
      
      const winner = await voting.getWinner();
      console.log(`\n🎉 GAGNANT: ${winner[0]} avec ${winner[1]} votes!`);
      console.log(`📍 Contrat: ${address}`);
      
    } catch (error) {
      console.log("❌ Erreur lors de la simulation:", error.message);
    }
  });

// Commande pour lister les comptes disponibles
task("accounts", "Affiche les comptes de test disponibles")
  .setAction(async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();
    
    console.log("👥 Comptes de test disponibles:");
    console.log("=" * 40);
    
    for (let i = 0; i < Math.min(accounts.length, 10); i++) {
      const balance = await hre.ethers.provider.getBalance(accounts[i].address);
      const balanceEth = hre.ethers.formatEther(balance);
      console.log(`${i}: ${accounts[i].address} (${balanceEth} ETH)`);
    }
    
    if (accounts.length > 10) {
      console.log(`... et ${accounts.length - 10} autres comptes`);
    }
    
    console.log(`\n💡 Total: ${accounts.length} comptes disponibles`);
  });

// Commande pour vérifier si une adresse a voté
task("check-vote", "Vérifie si une adresse a déjà voté")
  .addParam("contract", "Adresse du contrat")
  .addParam("address", "Adresse de l'électeur à vérifier")
  .setAction(async (taskArgs, hre) => {
    try {
      const voting = await hre.ethers.getContractAt("Voting", taskArgs.contract);
      const hasVoted = await voting.hasVoted(taskArgs.address);
      
      console.log(`👤 Électeur: ${taskArgs.address}`);
      console.log(`🗳️  A voté: ${hasVoted ? 'OUI' : 'NON'}`);
      
      if (hasVoted) {
        console.log("✅ Cette adresse a déjà participé à l'élection");
      } else {
        console.log("📝 Cette adresse peut encore voter");
      }
      
    } catch (error) {
      console.log("❌ Erreur:", error.message);
    }
  });

// Commande d'aide personnalisée
task("voting-help", "Affiche l'aide pour les commandes de vote")
  .setAction(async () => {
    console.log("🗳️  COMMANDES DE VOTE DISPONIBLES");
    console.log("=" * 50);
    console.log("");
    console.log("📦 DÉPLOIEMENT:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates 'Jean,Marie,Pierre'");
    console.log("");
    console.log("🗳️  VOTER (utilisez l'adresse retournée par deploy-voting):");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ADRESSE  --network docker # Premier candidat");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract ADRESSE --network docker # Deuxième candidat");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 2 --contract ADRESSE  --network docker # Troisième candidat");
    console.log("");
    console.log("📊 RÉSULTATS:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract ADRESSE --network docker");
    console.log("");
    console.log("🧪 SIMULATION COMPLÈTE:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate --votes 20");
    console.log("");
    console.log("🔍 VÉRIFICATIONS:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat accounts");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat check-vote --contract ADRESSE --address ADRESSE_ELECTEUR");
    console.log("");
    console.log("💡 EXEMPLE COMPLET:");
    console.log("   # 1. Déployer");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
    console.log("   # 2. Voter (remplacez 0x123... par l'adresse retournée)");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract 0x123...");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract 0x123...");
    console.log("   # 3. Voir les résultats");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract 0x123...");
    console.log("");
    console.log("🎯 ASTUCE: Les index des candidats commencent à 0 (Alice=0, Bob=1, Carol=2)");
  });