// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    event Voted(address indexed voter, uint256 indexed candidateIndex);

    constructor(string[] memory candidateNames) {
        require(candidateNames.length > 0, "Must provide at least one candidate");
        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate({name: candidateNames[i], voteCount: 0}));
        }
    }

    function vote(uint256 candidateIndex) external {
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateIndex < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateIndex].voteCount += 1;

        emit Voted(msg.sender, candidateIndex);
    }

    function candidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidates() external view returns (string[] memory names, uint256[] memory votes) {
        uint256 len = candidates.length;
        names = new string[](len);
        votes = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            names[i] = candidates[i].name;
            votes[i] = candidates[i].voteCount;
        }
    }

    function getWinner() external view returns (string memory winnerName, uint256 winningVotes) {
        uint256 len = candidates.length;
        require(len > 0, "No candidates");
        uint256 best = 0;
        uint256 bestIndex = 0;
        for (uint256 i = 0; i < len; i++) {
            if (candidates[i].voteCount > best) {
                best = candidates[i].voteCount;
                bestIndex = i;
            }
        }
        return (candidates[bestIndex].name, candidates[bestIndex].voteCount);
    }
}
