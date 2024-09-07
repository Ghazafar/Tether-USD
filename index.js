const axios = require('axios');

async function getEthUsdPrice() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'ethereum',
                vs_currencies: 'usd'
            }
        });
        const price = response.data.ethereum.usd;
        console.log(`Current ETH/USD Price: $${price}`);
        return price;
    } catch (error) {
        console.error('Error fetching price:', error);
    }
}

getEthUsdPrice();