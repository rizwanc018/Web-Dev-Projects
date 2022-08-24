let dataPoints = [];
let lastItem;
let chart;
let previousPrice = 0;
let color = 'black';
const coinPairs = [];
let coinPairUpper = 'BTCUSDT'
let coinPairLower = 'btcusdt'
let currentPair = coinPairUpper;
let balance = 1000;
let closePrice;  // close price from ws
let buyLimit = -100000000;
let sellLimit = 100000000;
let costOfBuying; //
let costofSelling // money made from selling
let currentCoinBalance;
let newlyBoughtQuantity;
let newlySoldQuantity;

let coin_pairs_url = 'https://api.binance.com/api/v1/exchangeInfo';
let api_url = `https://api.binance.com/api/v3/klines?symbol=${coinPairUpper}&interval=1m&limit=120`;
let webSocket_url = `wss://stream.binance.com:9443/ws/${coinPairLower}@kline_1m`


const fundForm = document.querySelector('.fund-form');
const balanceElt = document.querySelector('.balance-amount');
const buyForm = document.querySelector('.buy-form');
const sellForm = document.querySelector('.sell-form');
const coinTicker = document.querySelectorAll('.cointicker');
const coinSearch = document.querySelector('.search-form');
const portfolio_ul = document.querySelector('.coins-ul');
const tickerPrice = document.querySelectorAll('.ticker-price');
const baseVolume = document.querySelector('.base-vol');
const quoteVolume = document.querySelector('.quote-vol');
const trades = document.querySelector('.trades');


const searchInput = document.querySelector('.coin-search');
const suggestions = document.querySelector('.suggestions');
let suggestionList;


async function getCoins() {
    const response = await fetch(coin_pairs_url);
    const data = await response.json();
    const symbolsArray = data.symbols;
    symbolsArray.forEach(e => {
        if (e.symbol.includes('USDT')) {
            coinPairs.push(e.symbol);
        }
    });
}

function findMatches(wordToMatch, coinPairs) {
    return coinPairs.filter(pairs => {
        const regex = new RegExp(wordToMatch, 'gi');
        return pairs.match(regex);
    })
}

function displayMatches() {
    if (!this.value) {
        suggestions.innerHTML = null;
        return;
    }
    // console.log(this.value);
    const matchArray = findMatches(this.value, coinPairs);
    let html = matchArray.map(pairs => {
        return `
          <li class="suggestionlist">
            <span class="suggestionlist">${pairs}</span>
          </li>
        `;
    }).join('');
    suggestions.innerHTML = html;
    suggestionList = document.querySelectorAll('.suggestionlist');
    suggestionList.forEach(e => e.addEventListener('click', readClick));
}

async function generateChartData() {
    // dataPoints = [];
    const response = await fetch(api_url);
    const data = await response.json();
    // console.log(data);
    data.forEach(e => {
        dataPoints.push({
            x: new Date(e[0]),
            y: [
                parseFloat(e[1]), parseFloat(e[2]), parseFloat(e[3]), parseFloat(e[4])
            ]
        })
    });
    chart.render();
    lastItem = dataPoints[dataPoints.length - 1];
}



function drawChart() {
    chart = new CanvasJS.Chart("chartContainer", {
        animationEnabled: true,
        // interactivityEnabled: true,
        theme: "light2", // "light1", "light2", "dark1", "dark2"
        exportEnabled: true,
        zoomEnabled: true,
        zoomType: "xy",
        // backgroundColor: "black",
        title: {
            text: ""
        },
        subtitles: [{
            text: ""
        }],
        axisX: {
            interval: 1,
            valueFormatString: "hh:mm",
            labelFontSize: 12,
            // labelAngle: 50
        },
        axisY: {
            prefix: "$",
            title: "",
            labelFontSize: 12,
            // labelAngle: 50

        },
        toolTip: {
            content: "Date: {x}<br /><strong>Price:</strong><br />Open: {y[0]}, Close: {y[3]}<br />High: {y[1]}, Low: {y[2]}"
        },
        data: [{
            type: "candlestick",
            yValueFormatString: "$##0.00",
            risingColor: "#1DD33F",
            fallingColor: "red",
            fillOpacity: 1,
            dataPoints: dataPoints
        }]
    });
    //////////////////////////////////////////////
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };
}

let connectionExist = false;
let ws = new WebSocket(webSocket_url);
function startSocketConnection() {
    if (connectionExist) {
        ws.close();
        ws = new WebSocket(webSocket_url);
    }
    let oldtime = 1;
    let flag = true;
    ws.onmessage = (e) => {
        if (flag) {
            oldtime = lastItem.x.getTime();
            flag = false;
        }
        let priceObj = JSON.parse(e.data);
        let newtime = priceObj.k.t;
        if (oldtime == newtime) {
            // console.log(oldtime, "match");
            dataPoints.pop();
        }
        closePrice = parseFloat(priceObj.k.c);

        if(closePrice <= buyLimit) {
            updateBuy();
            buyLimit = -1000000000;
        }

        if(closePrice >= sellLimit) {
            // console.log('inside ws');
            updateSell();
            sellLimit = 1000000000;
        }

        previousPrice < closePrice ? color = 'green' : color = 'red';
        tickerPrice.forEach(e => {
            e.innerHTML = parseFloat(priceObj.k.c);
            e.style.color = color;
        })
        baseVolume.innerHTML = parseFloat(priceObj.k.v).toFixed(2);
        quoteVolume.innerHTML = parseFloat(priceObj.k.q).toFixed(2);
        trades.innerHTML = parseFloat(priceObj.k.n).toFixed(2);
        previousPrice = closePrice;

        dataPoints.push({
            x: new Date(priceObj.k.t),
            y: [
                parseFloat(priceObj.k.o), parseFloat(priceObj.k.h), parseFloat(priceObj.k.l), closePrice
            ]
        })
        oldtime = newtime;
        chart.render();
    };
    connectionExist = true;
}

function readClick() {
    let coinName = this.innerText;
    changeCoin(coinName);
    coinSearch.reset();
}

function readForm(e) {
    e.preventDefault();
    const searchedCoin = this.querySelector('[name=coin-search]').value;
    changeCoin(searchedCoin);
    this.reset();
}

function changeCoin(coinName) {
    buyLimit = -100000000;
    coinPairUpper = coinName.toUpperCase();
    coinPairLower = coinName.toLowerCase();
    currentPair = coinPairUpper;
    coinTicker.forEach(e => {
        e.innerHTML = coinPairUpper;
    });
    api_url = `https://api.binance.com/api/v3/klines?symbol=${coinPairUpper}&interval=1m&limit=120`;
    webSocket_url = `wss://stream.binance.com:9443/ws/${coinPairLower}@kline_1m`;
    dataPoints = [];
    displayMatches()
    generateChartData();
    drawChart();
    startSocketConnection();

}

function updateBalance() {
    balanceElt.innerHTML = balance.toFixed(3);
}

function addFund(e) {
    e.preventDefault();
    const amountToAdd = this.querySelector('[name=add-funds]').value;
    balance += parseFloat(amountToAdd);
    updateBalance();
    this.reset();
}

function buyCoin(e) {
    e.preventDefault();
    let price;
    let quantity;
    price = parseFloat(this.querySelector('#buy-price').value);
    quantity = parseFloat(this.querySelector('#buy-quantity').value);
    costOfBuying = price * quantity;
    if (balance < costOfBuying) {
        alert(`Not enough balance`);
        return;
    }
    buyLimit = price;
    newlyBoughtQuantity = quantity;
    this.reset();
}

function sellCoin(e) {
    e.preventDefault();
    let sellPrice;
    let sellQuantity;
    sellPrice = parseFloat(this.querySelector('#sell-price').value);
    sellQuantity = parseFloat(this.querySelector('#sell-quantity').value);
    let coinExist = document.querySelector(`#${currentPair}`);
    if(!coinExist) {
        // console.log('Not enough coin');
        alert('Not enough coin');
        return;
    }
    currentCoinBalance = parseFloat(document.querySelector(`#${currentPair}-count`).innerHTML); 
    if (currentCoinBalance < sellQuantity) {
        // console.log('Not enough coin');
        alert('Not enough coin');
        return;
    }
    sellLimit = sellPrice;
    costofSelling = sellPrice * sellQuantity;
    newlySoldQuantity = sellQuantity;
    this.reset();
}

function updatePortfolioAfterBuying() {
    let coinExist = document.querySelector(`#${currentPair}`);
    if (coinExist) {
        currentCoinBalance = parseFloat(document.querySelector(`#${currentPair}-count`).innerHTML); 
        // console.log(currentCoinBalance + newlyBoughtQuantity);
        document.querySelector(`#${currentPair}-count`).innerHTML = currentCoinBalance + newlyBoughtQuantity;
    } else {
        currentCoinBalance = newlyBoughtQuantity;
        let html = `<li> 
                    <span id="${currentPair}">${currentPair}</span>
                    <span id="${currentPair}-count">${currentCoinBalance}</span>
                </li>`;
        portfolio_ul.innerHTML += html;
    }

}

function updatePortfolioAfterSelling() {
    currentCoinBalance = parseFloat(document.querySelector(`#${currentPair}-count`).innerHTML); 
    // console.log(currentCoinBalance);
    document.querySelector(`#${currentPair}-count`).innerHTML = currentCoinBalance - newlySoldQuantity;
}

function updateBuy() {
    balance -= costOfBuying;
    updateBalance();
    updatePortfolioAfterBuying();
}

function updateSell() {
    balance += costofSelling;
    // console.log('here balance', balance)
    updateBalance();
    updatePortfolioAfterSelling();
}

generateChartData();
drawChart();
startSocketConnection();
getCoins();
updateBalance();

searchInput.addEventListener('input', displayMatches);
coinSearch.addEventListener('submit', readForm);
fundForm.addEventListener('submit', addFund);
buyForm.addEventListener('submit', buyCoin);
sellForm.addEventListener('submit',sellCoin);