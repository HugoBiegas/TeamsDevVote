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
      viaIR: false, // Optimisation pour Docker
    },
  },
  
  // PAS de defaultNetwork défini - Hardhat utilise automatiquement "hardhat"
  
  networks: {
    // Configuration par défaut Hardhat (réseau intégré) - Optimisé Docker
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
      allowUnlimitedContractSize: process.env.NODE_ENV !== "production",
      mining: {
        auto: true,
        interval: process.env.MINING_INTERVAL || 0,
      },
    },
    
    // Configuration pour connexion externe au nœud local qui tourne
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 60000,
      httpHeaders: {
        "User-Agent": "Hardhat-Docker-Client"
      },
    },
    
    // Configuration pour Docker (communication inter-conteneurs) - PRINCIPAL
    docker: {
      url: "http://hardhat-dev:8545",
      chainId: 31337,
      timeout: 60000,
      httpHeaders: {
        "User-Agent": "Hardhat-Docker-Internal"
      },
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
    
    // Configuration pour les réseaux externes via Docker
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      timeout: 60000,
    },
    
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gas: "auto",
      gasPrice: "auto",
      timeout: 120000, // Plus long pour mainnet
    },
  },
  
  // Configuration des chemins optimisée pour Docker
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  // Configuration Mocha pour les tests avec timeout adapté Docker
  mocha: {
    timeout: 120000, // Plus long pour Docker
    retries: 2, // Retry en cas d'échec réseau
  },
  
  // Configuration du gas reporter (optionnel)
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  
  // Configuration de Etherscan (pour la vérification)
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    }
  },
  
  // Configuration spécifique Docker
  docker: {
    // Configuration pour le healthcheck
    healthcheck: {
      enabled: true,
      interval: 30000,
      timeout: 10000,
      retries: 3,
    },
    
    // Configuration des logs
    logging: {
      level: process.env.LOG_LEVEL || "info",
      format: "json",
    },
  },
  
  // Configuration de sécurité pour Docker
  security: {
    // Désactiver les fonctions dangereuses en production
    allowUnlimitedContractSize: process.env.NODE_ENV !== "production",
    
    // Configuration du mining interval pour les tests
    mining: {
      auto: true,
      interval: process.env.MINING_INTERVAL || 0,
    },
  },
};

// ===============================================
// COMMANDES PRÉFAITES POUR VOTER - VERSION DOCKER
// ===============================================

// Commande pour voter rapidement - Optimisée Docker
task("vote", "Vote pour un candidat")
  .addParam("candidate", "Index du candidat (0=Alice, 1=Bob, 2=Carol)")
  .addOptionalParam("contract", "Adresse du contrat", "")
  .addOptionalParam("network", "Réseau à utiliser", "hardhat")
  .setAction(async (taskArgs, hre) => {
    console.log(`🐳 Mode Docker - Réseau: ${taskArgs.network}`);
    
    const [signer] = await hre.ethers.getSigners();
    
    let contractAddress = taskArgs.contract;
    
    // Si pas d'adresse fournie, déployer un nouveau contrat
    if (!contractAddress) {
      console.log("📦 Déploiement d'un nouveau contrat...");
      const Voting = await hre.ethers.getContractFactory("Voting");
      const voting = await Voting.deploy(["Alice", "Bob", "Carol"]);
      await voting.waitForDeployment();
      contractAddress = await voting.getAddress();
      console.log("✅ Contrat déployé:", contractAddress);
      console.log("🐳 Réseau utilisé:", hre.network.name);
    }
    
    // Se connecter au contrat
    const voting = await hre.ethers.getContractAt("Voting", contractAddress);
    
    // Voter
    const candidateIndex = parseInt(taskArgs.candidate);
    const candidateNames = ["Alice", "Bob", "Carol"];
    
    if (candidateIndex < 0 || candidateIndex >= candidateNames.length) {
      console.log("❌ Index invalide! Utilisez 0=Alice, 1=Bob, 2=Carol");
      return;
    }
    
    console.log(`🗳️  Vote pour ${candidateNames[candidateIndex]} (index ${candidateIndex})`);
    console.log(`👤 Électeur: ${signer.address}`);
    console.log(`🌐 Réseau: ${hre.network.name} (${hre.network.config.chainId})`);
    
    try {
      // Gas estimation pour Docker
      const gasEstimate = await voting.vote.estimateGas(candidateIndex);
      console.log(`⛽ Gas estimé: ${gasEstimate.toString()}`);
      
      const tx = await voting.vote(candidateIndex, {
        gasLimit: gasEstimate * 120n / 100n // 20% de marge
      });
      
      console.log("⏳ Transaction envoyée, attente de confirmation...");
      const receipt = await tx.wait();
      
      console.log("✅ Vote enregistré!");
      console.log("📍 Transaction:", tx.hash);
      console.log("🧮 Gas utilisé:", receipt.gasUsed.toString());
      console.log("🧱 Bloc:", receipt.blockNumber);
      
    } catch (error) {
      if (error.message.includes("Already voted")) {
        console.log("❌ Cette adresse a déjà voté!");
      } else if (error.message.includes("Invalid candidate")) {
        console.log("❌ Candidat invalide!");
      } else if (error.code === 'NETWORK_ERROR') {
        console.log("❌ Erreur réseau Docker. Vérifiez que le nœud Hardhat fonctionne.");
        console.log("💡 Essayez: docker-compose ps | grep hardhat-dev");
      } else {
        console.log("❌ Erreur:", error.message);
      }
      return;
    }
    
    // Afficher les résultats actuels
    try {
      const results = await voting.getCandidates();
      console.log("\n📊 Résultats actuels:");
      results[0].forEach((name, i) => {
        console.log(`   ${name}: ${results[1][i]} votes`);
      });
      
      const winner = await voting.getWinner();
      console.log(`\n🏆 Gagnant actuel: ${winner[0]} (${winner[1]} votes)`);
    } catch (error) {
      console.log("⚠️  Impossible d'afficher les résultats:", error.message);
    }
  });

// Commande pour voir les résultats - Version Docker
task("results", "Affiche les résultats de vote")
  .addParam("contract", "Adresse du contrat")
  .addOptionalParam("network", "Réseau à utiliser", "hardhat")
  .setAction(async (taskArgs, hre) => {
    console.log(`🐳 Mode Docker - Réseau: ${taskArgs.network}`);
    
    try {
      const voting = await hre.ethers.getContractAt("Voting", taskArgs.contract);
      
      console.log("📊 Résultats de l'élection:");
      console.log("📍 Contrat:", taskArgs.contract);
      console.log("🌐 Réseau:", hre.network.name);
      console.log("🔗 Chain ID:", hre.network.config.chainId);
      
      // Test de connectivité
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log("🧱 Bloc actuel:", blockNumber);
      
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
      
      // Informations du contrat
      const candidateCount = await voting.candidateCount();
      console.log(`\n📋 Nombre de candidats: ${candidateCount}`);
      
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        console.log("❌ Erreur réseau Docker:", error.message);
        console.log("💡 Vérifications:");
        console.log("   - Le nœud Hardhat est-il démarré ? (docker-compose ps)");
        console.log("   - L'adresse du contrat est-elle correcte ?");
        console.log("   - Le réseau est-il le bon ?");
      } else {
        console.log("❌ Erreur lors de la lecture des résultats:", error.message);
      }
    }
  });

// Commande pour déployer avec candidats personnalisés - Version Docker
task("deploy-voting", "Déploie un contrat de vote")
  .addOptionalParam("candidates", "Candidats séparés par des virgules", "Alice,Bob,Carol")
  .addOptionalParam("network", "Réseau à utiliser", "hardhat")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    
    if (candidates.length < 2) {
      console.log("❌ Il faut au moins 2 candidats!");
      return;
    }
    
    console.log("🐳 Déploiement Docker du contrat de vote...");
    console.log("👥 Candidats:", candidates);
    console.log("🌐 Réseau:", hre.network.name);
    console.log("🔗 Chain ID:", hre.network.config.chainId);
    
    try {
      const [deployer] = await hre.ethers.getSigners();
      console.log("👤 Déployeur:", deployer.address);
      
      // Vérifier le solde
      const balance = await hre.ethers.provider.getBalance(deployer.address);
      console.log("💰 Solde:", hre.ethers.formatEther(balance), "ETH");
      
      // Vérifier la connectivité réseau
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log("🧱 Bloc actuel:", blockNumber);
      
      const Voting = await hre.ethers.getContractFactory("Voting");
      
      // Estimation du gas
      const deployTransaction = Voting.getDeployTransaction(candidates);
      const gasEstimate = await hre.ethers.provider.estimateGas(deployTransaction);
      console.log("⛽ Gas estimé pour le déploiement:", gasEstimate.toString());
      
      const voting = await Voting.deploy(candidates, {
        gasLimit: gasEstimate * 120n / 100n // 20% de marge
      });
      
      console.log("⏳ Déploiement en cours...");
      await voting.waitForDeployment();
      
      const address = await voting.getAddress();
      console.log("✅ Contrat déployé à:", address);
      console.log("🗳️  Prêt pour le vote!");
      
      // Vérification post-déploiement
      const deployedCandidates = await voting.getCandidates();
      console.log("\n📋 Candidats confirmés:");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   ${i}: ${name}`);
      });
      
      console.log("\n💡 Commandes pour voter :");
      console.log("🐳 Avec Docker Compose (RECOMMANDÉ) :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate ${i} --contract ${address}  # ${name}`);
      });
      
      console.log("\n⚡ Depuis l'intérieur d'un conteneur :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   npx hardhat vote --candidate ${i} --contract ${address}  # ${name}`);
      });
      
      console.log("\n📊 Pour voir les résultats :");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract ${address}`);
      
      console.log("\n🧪 Pour simuler plus de votes :");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat simulate --votes 10`);
      
      return address;
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        console.log("❌ Erreur réseau Docker lors du déploiement:", error.message);
        console.log("💡 Vérifiez que le nœud Hardhat est démarré:");
        console.log("   docker-compose up -d hardhat-dev");
      } else {
        console.log("❌ Erreur lors du déploiement:", error.message);
      }
    }
  });

// Commande pour simuler une élection complète - Version Docker
task("simulate", "Simule une élection complète")
  .addOptionalParam("votes", "Nombre de votes à simuler", "10")
  .addOptionalParam("candidates", "Candidats personnalisés", "Alice,Bob,Carol")
  .addOptionalParam("network", "Réseau à utiliser", "hardhat")
  .setAction(async (taskArgs, hre) => {
    const candidates = taskArgs.candidates.split(',').map(c => c.trim());
    const numVotes = parseInt(taskArgs.votes);
    
    console.log("🐳 Simulation d'élection Docker...");
    console.log("👥 Candidats:", candidates);
    console.log("📊 Nombre de votes:", numVotes);
    console.log("🌐 Réseau:", hre.network.name);
    
    try {
      // Test de connectivité
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log("🧱 Bloc de départ:", blockNumber);
      
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
      
      // Votes avec gestion d'erreur Docker
      const votePromises = [];
      const voteDistribution = new Array(candidates.length).fill(0);
      
      for (let i = 0; i < availableSigners; i++) {
        const candidateChoice = Math.floor(Math.random() * candidates.length);
        voteDistribution[candidateChoice]++;
        
        const votePromise = voting.connect(signers[i + 1]).vote(candidateChoice)
          .then(tx => tx.wait())
          .then(() => {
            console.log(`✅ Électeur ${i + 1} vote pour ${candidates[candidateChoice]}`);
            return true;
          })
          .catch(error => {
            console.log(`❌ Électeur ${i + 1} - Erreur:`, error.message);
            return false;
          });
        
        votePromises.push(votePromise);
        
        // Résultats partiels tous les 5 votes
        if ((i + 1) % 5 === 0) {
          await Promise.all(votePromises);
          votePromises.length = 0; // Reset
          
          try {
            const partial = await voting.getCandidates();
            console.log(`📊 Après ${i + 1} votes:`, 
              partial[0].map((name, idx) => `${name}=${partial[1][idx]}`).join(', '));
          } catch (error) {
            console.log("⚠️  Impossible d'afficher les résultats partiels");
          }
        }
        
        // Petit délai pour éviter la surcharge réseau Docker
        if (i < availableSigners - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Attendre tous les votes restants
      await Promise.all(votePromises);
      
      // Bloc final
      const finalBlockNumber = await hre.ethers.provider.getBlockNumber();
      console.log(`🧱 Bloc final: ${finalBlockNumber} (+${finalBlockNumber - blockNumber} blocs)`);
      
      // Résultats finaux détaillés
      console.log("\n" + "=".repeat(60));
      console.log("🏆 RÉSULTATS FINAUX DE L'ÉLECTION DOCKER");
      console.log("=".repeat(60));
      
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
      console.log(`🌐 Réseau: ${hre.network.name}`);
      console.log(`🐳 Environment: Docker`);
      
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        console.log("❌ Erreur réseau Docker lors de la simulation:", error.message);
        console.log("💡 Vérifiez la connectivité Docker");
      } else {
        console.log("❌ Erreur lors de la simulation:", error.message);
      }
    }
  });

// Commande spécifique Docker pour vérifier la connectivité
task("docker-status", "Vérifie l'état de la connectivité Docker")
  .setAction(async (taskArgs, hre) => {
    console.log("🐳 DIAGNOSTIC DOCKER - Voting DApp");
    console.log("=" * 50);
    
    try {
      // Informations réseau
      console.log("🌐 Réseau actuel:", hre.network.name);
      console.log("🔗 Chain ID:", hre.network.config.chainId);
      console.log("📡 URL RPC:", hre.network.config.url || "Réseau intégré");
      
      // Test de connectivité
      console.log("\n🔌 Test de connectivité...");
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log("✅ Bloc actuel:", blockNumber);
      
      // Informations sur les comptes
      const signers = await hre.ethers.getSigners();
      console.log("👥 Comptes disponibles:", signers.length);
      
      if (signers.length > 0) {
        const balance = await hre.ethers.provider.getBalance(signers[0].address);
        console.log("💰 Solde du premier compte:", hre.ethers.formatEther(balance), "ETH");
      }
      
      // Version du nœud
      try {
        const version = await hre.ethers.provider.send("web3_clientVersion", []);
        console.log("🔧 Version du nœud:", version);
      } catch (error) {
        console.log("🔧 Version du nœud: Non disponible");
      }
      
      console.log("\n✅ Tout semble fonctionner correctement!");
      
    } catch (error) {
      console.log("\n❌ PROBLÈME DÉTECTÉ:");
      console.log("Erreur:", error.message);
      console.log("\n💡 Vérifications recommandées:");
      console.log("1. docker-compose ps | grep hardhat");
      console.log("2. docker-compose logs hardhat-dev");
      console.log("3. docker-compose restart hardhat-dev");
    }
  });

// Commande d'aide spécifique Docker
task("docker-help", "Affiche l'aide pour les commandes Docker")
  .setAction(async () => {
    console.log("🐳 COMMANDES DOCKER VOTING DAPP");
    console.log("=" * 60);
    console.log("");
    console.log("📦 DÉPLOIEMENT:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting --candidates 'Jean,Marie'");
    console.log("");
    console.log("🗳️  VOTER:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ADRESSE");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract ADRESSE");
    console.log("");
    console.log("📊 RÉSULTATS:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract ADRESSE");
    console.log("");
    console.log("🧪 SIMULATION:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat simulate --votes 20");
    console.log("");
    console.log("🔍 DIAGNOSTIC:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat docker-status");
    console.log("   docker-compose ps");
    console.log("   docker-compose logs hardhat-dev");
    console.log("");
    console.log("💡 RÉSEAUX DISPONIBLES:");
    console.log("   --network hardhat   (par défaut, réseau intégré)");
    console.log("   --network docker    (communication inter-conteneurs)");
    console.log("   --network localhost (connexion externe)");
    console.log("   --network ganache   (si Ganache activé)");
    console.log("");
    console.log("🚀 DÉMARRAGE RAPIDE:");
    console.log("   docker-compose up -d hardhat-dev");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat deploy-voting");
    console.log("   # Utilisez l'adresse retournée pour voter");
  });