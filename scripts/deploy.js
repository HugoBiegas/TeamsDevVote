async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Voting = await ethers.getContractFactory("Voting");
  const candidates = ["Alice", "Bob", "Carol"];
  const voting = await Voting.deploy(candidates);
  await voting.waitForDeployment();
  console.log("Voting deployed to:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
