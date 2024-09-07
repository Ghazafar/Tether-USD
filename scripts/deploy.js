const { ethers, run } = require("hardhat");

async function main() {
  try {
    // Get the deployer's wallet information
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Define addresses for price feeds, USDT contract, and Uniswap Router
    const UsdtEthPriceFeedAddress = "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46"; // USDT/ETH price feed address (mainnet)
    const usdtUsdPriceFeedAddress = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D"; // USDT/USD price feed address (mainnet)
    const usdtContractAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT contract address (mainnet)
    const uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Correct Uniswap V2 Router address (mainnet)

    // Testnet Address (Example for Goerli)
    // const UsdtEthPriceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD price feed address (Goerli)
    // const usdtUsdPriceFeedAddress = "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"; // USDT/USD price feed address (Goerli)
    // const usdtContractAddress = "0xdE184350eb0108E166525F912740D4E47c34c074"; // USDT contract address (Goerli)
    // const uniswapRouterAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Correct Uniswap V2 Router address (Goerli)

    // Fetch the TetherToken contract factory
    const TetherToken = await ethers.getContractFactory("TetherToken");

    console.log("Deploying TetherToken contract...");
    // Deploy the TetherToken contract with the price feed addresses and Uniswap router
    const tetherToken = await TetherToken.deploy(
      UsdtEthPriceFeedAddress,
      usdtUsdPriceFeedAddress,
      usdtContractAddress,
      uniswapRouterAddress
    );

    // Wait until the contract is deployed
    await tetherToken.deployed();
    console.log("TetherToken deployed to:", tetherToken.address);

    // Example of checking tetherToken contract functionality
    const latestUsdtEthPrice = await tetherToken.getLatestUsdtEthPrice();
    console.log("Latest USDT/ETH price (18 decimals):", ethers.utils.formatUnits(latestUsdtEthPrice, 18));
    
    const latestUsdtUsdPrice = await tetherToken.getLatestUsdtUsdPrice();
    console.log("Latest USDT/USD price (8 decimals):", ethers.utils.formatUnits(latestUsdtUsdPrice, 8));
    
    // Example calculations to ensure the peg
    const usdtInEth = latestUsdtEthPrice / latestUsdtUsdPrice;
    console.log("1 USDT in ETH:", usdtInEth.toFixed(10)); // Show with 10 decimals

    // Mint tokens to the deployer's address
    const mintAmount = ethers.utils.parseUnits("100000", 6); // Mint 100,000 tokens with 6 decimals
    await tetherToken.mint(deployer.address, mintAmount);
    console.log(`Minted ${ethers.utils.formatUnits(mintAmount, 6)} tetherToken tokens to the deployer's address.`);

    // Transfer some tokens to another address
    const recipient = "0x16C4891146BaCf9017D1F115F3a986D29Cb13d32"; // Replace with the actual recipient address
    const transferAmount = ethers.utils.parseUnits("50000", 6); // Transfer 50,000 tokens with 6 decimals
    await tetherToken.transfer(recipient, transferAmount);
    console.log(`Transferred ${ethers.utils.formatUnits(transferAmount, 6)} tetherToken tokens to ${recipient}.`);

    // Example of checking balances after the transfer
    const deployerBalance = await tetherToken.balanceOf(deployer.address);
    const recipientBalance = await tetherToken.balanceOf(recipient);
    console.log("Deployer balance after mint and transfer:", ethers.utils.formatUnits(deployerBalance, 6));
    console.log("Recipient balance after transfer:", ethers.utils.formatUnits(recipientBalance, 6));

    // Verify the tetherToken contract on Etherscan
    console.log("Verifying contract on Etherscan...");
    await run("verify:verify", {
      address: tetherToken.address,
      constructorArguments: [UsdtEthPriceFeedAddress, usdtUsdPriceFeedAddress, usdtContractAddress, uniswapRouterAddress],
    });
    console.log("Contract verified successfully on Etherscan.");
  } catch (error) {
    console.error("Error interacting with TetherToken contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed with error:", error);
    process.exit(1);
});


// scripts/deploy.js

// const { ethers, run } = require("hardhat");
// require("dotenv").config(); // Load environment variables
// const fs = require('fs'); // File system module to read ABI files

// async function main() {
//   // Set up provider and wallet using Infura and private key from environment variables
//   const provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_API_KEY);
//   const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

//   console.log("Deploying contracts with the account:", wallet.address);

//   // Define addresses for price feeds and USDT contract
//   const UsdtEthPriceFeedAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // ETH/USD price feed address
//   const usdtUsdPriceFeedAddress = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D"; // USDT/USD price feed address
//   const usdtContractAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT contract address on Ethereum Mainnet

//   // Load the ABI for the USDT contract from the file
//   const usdtAbi = JSON.parse(fs.readFileSync('./scripts/usdtABI.json', 'utf8'));

//   // Fetch the tetherToken contract factory
//   const tetherToken = await ethers.getContractFactory("tetherToken", wallet);

//   console.log("Deploying tetherToken contract...");
//   // Deploy the tetherToken contract with the price feed addresses
//   const tetherToken = await tetherToken.deploy(UsdtEthPriceFeedAddress, usdtUsdPriceFeedAddress, usdtContractAddress);

//   // Wait until the contract is deployed
//   await tetherToken.deployed();
//   console.log("tetherToken deployed to:", tetherToken.address);

//   // Create a contract instance for USDT using the loaded ABI
//   const usdtContract = new ethers.Contract(usdtContractAddress, usdtAbi, wallet);

//   try {
//     // Fetch the USDT balance of the wallet
//     const balance = await usdtContract.balanceOf(wallet.address);
//     console.log(`USDT Balance of ${wallet.address}: ${ethers.utils.formatUnits(balance, 6)} USDT`);

//     // Fetch total supply of USDT
//     const totalSupply = await usdtContract.totalSupply();
//     console.log(`Total Supply of USDT: ${ethers.utils.formatUnits(totalSupply, 6)} USDT`);

//     // Example of checking tetherToken contract functionality
//     const latestUsdtEthPrice = await tetherToken.getLatestUsdtEthPrice();
//     console.log("Latest ETH/USD price (8 decimals):", ethers.utils.formatUnits(latestUsdtEthPrice, 8));

//     const latestUsdtUsdPrice = await tetherToken.getLatestUsdtUsdPrice();
//     console.log("Latest USDT/USD price (8 decimals):", ethers.utils.formatUnits(latestUsdtUsdPrice, 8));

//     // Example calculations to ensure the peg
//     const usdtInEth = latestUsdtEthPrice / latestUsdtUsdPrice;
//     console.log("1 USDT in ETH:", usdtInEth.toFixed(10)); // Show with 10 decimals

//         // Mint tokens to the deployer's address
//         const mintAmount = ethers.utils.parseUnits("1000000", 6); // Mint 1,000,000 tokens with 18 decimals
//         await tetherToken.mint(deployer.address, mintAmount);
//         console.log(`Minted ${ethers.utils.formatUnits(mintAmount, 6)} tetherToken tokens to the deployer's address.`);
    
//         // Transfer some tokens to another address
//         const recipient = "0xda6AA7d4B50D153Fe75aa500a19eD95Fb921Fe0D"; // Replace with the actual recipient address
//         const transferAmount = ethers.utils.parseUnits("500000", 6); // Transfer 500,000 tokens with 18 decimals
//         await tetherToken.transfer(recipient, transferAmount);
//         console.log(`Transferred ${ethers.utils.formatUnits(transferAmount, 6)} tetherToken tokens to ${recipient}.`);
    
//         // Example of checking balances after the transfer
//         const deployerBalance = await tetherToken.balanceOf(deployer.address);
//         const recipientBalance = await tetherToken.balanceOf(recipient);
//         console.log("Deployer balance after mint and transfer:", ethers.utils.formatUnits(deployerBalance, 6));
//         console.log("Recipient balance after transfer:", ethers.utils.formatUnits(recipientBalance, 6));

//     // Verify the tetherToken contract on Etherscan
//     console.log("Verifying contract on Etherscan...");
//     await run("verify:verify", {
//       address: tetherToken.address,
//       constructorArguments: [UsdtEthPriceFeedAddress, usdtUsdPriceFeedAddress, usdtContractAddress],
//     });
//     console.log("Contract verified successfully on Etherscan.");
//   } catch (error) {
//     console.error("Error interacting with USDT contract:", error);
//   }
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error("Script failed with error:", error);
//     process.exit(1);
// });