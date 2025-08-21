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
    
    // Configuration pour les réseaux externes (à personnaliser)
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
  
  // Configuration du gas reporter (optionnel)
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  
  // Configuration de Etherscan (pour la vérification)
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
task("vote", "Vote pour un candidat")
  .addParam("candidate", "Index du candidat (0=Alice, 1=Bob, 2=Carol)")
  .addOptionalParam("contract", "Adresse du contrat", "")
  .setAction(async (taskArgs, hre) => {
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
    
    try {
      const tx = await voting.vote(candidateIndex);
      await tx.wait();
      console.log("✅ Vote enregistré!");
      console.log("📍 Transaction:", tx.hash);
    } catch (error) {
      if (error.message.includes("Already voted")) {
        console.log("❌ Cette adresse a déjà voté!");
      } else if (error.message.includes("Invalid candidate")) {
        console.log("❌ Candidat invalide!");
      } else {
        console.log("❌ Erreur:", error.message);
      }
      return;
    }
    
    // Afficher les résultats actuels
    const results = await voting.getCandidates();
    console.log("\n📊 Résultats actuels:");
    results[0].forEach((name, i) => {
      console.log(`   ${name}: ${results[1][i]} votes`);
    });
    
    const winner = await voting.getWinner();
    console.log(`\n🏆 Gagnant actuel: ${winner[0]} (${winner[1]} votes)`);
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
        console.log(`   docker-compose run --rm hardhat-dev npx hardhat vote --candidate ${i} --contract ${address}  # ${name}`);
      });
      
      console.log("\n⚡ Ou directement dans un conteneur :");
      deployedCandidates[0].forEach((name, i) => {
        console.log(`   npx hardhat vote --candidate ${i} --contract ${address}  # ${name}`);
      });
      
      console.log("\n📊 Pour voir les résultats :");
      console.log(`   docker-compose run --rm hardhat-dev npx hardhat results --contract ${address}`);
      
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
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 0 --contract ADRESSE  # Premier candidat");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 1 --contract ADRESSE  # Deuxième candidat");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat vote --candidate 2 --contract ADRESSE  # Troisième candidat");
    console.log("");
    console.log("📊 RÉSULTATS:");
    console.log("   docker-compose run --rm hardhat-dev npx hardhat results --contract ADRESSE");
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