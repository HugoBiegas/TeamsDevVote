async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const Voting = await ethers.getContractFactory("Voting");
  const candidates = ["Alice", "Bob", "Carol"];
  
  console.log("Deploying Voting contract with candidates:", candidates);
  const voting = await Voting.deploy(candidates);
  await voting.waitForDeployment();
  
  // ✅ CORRECTION : utiliser getAddress() au lieu de .address
  const contractAddress = await voting.getAddress();
  console.log("Voting deployed to:", contractAddress);
  
  // Vérification rapide du déploiement
  const deployedCandidates = await voting.getCandidates();
  console.log("Candidates initialized:", deployedCandidates);
  
  console.log("\n🎉 Deployment successful!");
  console.log("📝 Contract address:", contractAddress);
  console.log("🗳️  Ready for voting!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });