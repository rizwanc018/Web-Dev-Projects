let dataPoints = [];
let lastItem;
let chart;
let previousPrice = 0;
let color = 'black';
const coinPairs = [];
let coinPairUpper = 'BTCUSDT'
let coinPairLower = 'btcusdt'

let coin_pairs_url = 'https://api.binance.com/api/v1/exchangeInfo';
let api_url = `https://api.binance.com/api/v3/klines?symbol=${coinPairUpper}&interval=1m&limit=120`;
let webSocket_url = `wss://stream.binance.com:9443/ws/${coinPairLower}@kline_1m`


const coinTicker = document.querySelectorAll('.cointicker');
const coinSearch = document.querySelector('.search-form');
const tickerPrice = document.querySelectorAll('.ticker-price');
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
    console.log(this.value);
    const matchArray = findMatches(this.value, coinPairs);
    const html = matchArray.map(pairs => {
        return `
          <li>
            <span class="suggestionlist">${pairs}</span>
          </li>
        `;
    }).join('');
    suggestions.innerHTML = html;
    suggestionList = document.querySelectorAll('.suggestionlist');
    // suggestionList.forEach(e => e.addEventListener('click', changeCoin))

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
    // const api_url = 'https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1';
    // async function generateChartData() {
    //     // dataPoints = [];
    //     const response = await fetch(api_url);
    //     const data = await response.json();
    //     // console.log(data);
    //     data.forEach(e => {
    //         dataPoints.push({
    //             x: new Date(e[0]),
    //             y: [
    //                 parseFloat(e[1]), parseFloat(e[2]), parseFloat(e[3]), parseFloat(e[4])
    //             ]
    //         })
    //     });
    //     chart.render();
    //     lastItem = dataPoints[dataPoints.length - 1];
    // }


    // generateChartData();
    /////////////////////////////////////////////////
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
        previousPrice < parseFloat(priceObj.k.c) ? color = 'green' : color = 'red';
        tickerPrice.forEach(e => {
            e.innerHTML = parseFloat(priceObj.k.c);
            e.style.color = color;
        })
        previousPrice = parseFloat(priceObj.k.c);
        dataPoints.push({
            x: new Date(priceObj.k.t),
            y: [
                parseFloat(priceObj.k.o), parseFloat(priceObj.k.h), parseFloat(priceObj.k.l), parseFloat(priceObj.k.c)
            ]
        })
        oldtime = newtime;
        chart.render();
    };
    connectionExist = true;
}

function readForm(e) {
    e.preventDefault();
    const searchedCoin = this.querySelector('[name=coin-search]').value;
    changeCoin(searchedCoin);
    this.reset();
}

function changeCoin(coinName) {
    coinPairUpper = coinName.toUpperCase();
    coinPairLower = coinName.toLowerCase();
    coinTicker.forEach(e => {
        e.innerHTML = coinPairUpper;
    });
    api_url = `https://api.binance.com/api/v3/klines?symbol=${coinPairUpper}&interval=1m&limit=120`;
    webSocket_url = `wss://stream.binance.com:9443/ws/${coinPairLower}@kline_1m`;
    dataPoints = [];
    generateChartData();
    drawChart();
    startSocketConnection();
}

searchInput.addEventListener('input', displayMatches);
coinSearch.addEventListener('submit', readForm);

generateChartData();
drawChart();
startSocketConnection();
getCoins();