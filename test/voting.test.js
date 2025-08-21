const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting contract", function () {
  let Voting;
  let voting;
  let owner;
  let addr1;
  let addr2;

  const candidates = ["Alice", "Bob", "Carol"];

  beforeEach(async function () {
    Voting = await ethers.getContractFactory("Voting");
    [owner, addr1, addr2] = await ethers.getSigners();

    voting = await Voting.deploy(candidates);
    await voting.waitForDeployment();
  });

  it("initializes candidates correctly", async function () {
    const count = await voting.candidateCount();
    expect(count).to.equal(candidates.length);

    const res = await voting.getCandidates();
    expect(res[0][0]).to.equal("Alice");
    expect(res[0].length).to.equal(candidates.length);
  });

  it("allows an account to vote once", async function () {
    await voting.connect(addr1).vote(1); // Bob
    const res = await voting.getCandidates();
    expect(res[1][1]).to.equal(1n);

    // double vote from same account should revert
    await expect(voting.connect(addr1).vote(0)).to.be.revertedWith(
      "Already voted"
    );
  });

  it("counts votes from multiple accounts", async function () {
    await voting.connect(addr1).vote(2); // Carol
    await voting.connect(addr2).vote(2); // Carol
    const res = await voting.getCandidates();
    // res[0] = names[], res[1] = votes[]
    expect(res[1][2]).to.equal(2n);

    const winner = await voting.getWinner();
    expect(winner[0]).to.equal("Carol");
    expect(winner[1]).to.equal(2n);
  });

  it("rejects invalid candidate index", async function () {
    await expect(voting.connect(addr1).vote(99)).to.be.revertedWith(
      "Invalid candidate"
    );
  });
});
