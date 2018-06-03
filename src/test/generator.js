import permutator from 'permutator';

const dataProvider = 'cryptoCandlestick';
const traderProvider = 'simulatorTrader';

const message = {
  "campaign": "TestCampaign01",
  "symbols": [
    ["POLONIEX_SPOT_ETH_BTC", "POLONIEX_SPOT_BTC_USDT"]
  ],
  "bot": [ "venom" ],
  "period": 86400,
  "dates": [
    ["2017-09-01T00:00:00.000Z", "2018-03-28T00:00:00.000Z"]
  ],
  "parameters": {
    "type" : "object",
    "schemas" : {
      "buy" : {
        "type" : "object",
        "schemas": {
          "ma" : {
            "type" : "value",
            "values" : [50]
          },
          "offset" : {
            "type" : "value",
            "values" : [0.97, 0.99, 1, 1.02]
          },
          "period" : {
            "type" : "value",
            "values" : [4, 5, 6, 7, 8, 9, 10, 11]
          }
        }
      },
      "sell" : {
        "type" : "object",
        "schemas": {
          "ma" : {
            "type" : "value",
            "values" : [50]
          },
          "offset" : {
            "type" : "value",
            "values" : [0.94, 0.95, 0.96, 0.97]
          },
          "period" : {
            "type" : "value",
            "values" : [1, 2, 3, 4, 5]
          }
        }
      }
    }
  }
};

if (!message.campaign) {
  message.campaign = `${new Date().getTime()}_campaign`;
}

const result = [];
message.symbols.forEach(symbols => {
  message.dates.forEach(dates => {

    const schema = {
      "type" : "object",
      "schemas" : {
        "parameters": message.parameters
      }
    };
    
    const base = {
      "simulation": true,
      "campaign": message.campaign,
      "symbol": symbols[0],
    
      "bot": message.bot,
      "data": dataProvider,
      "trader": traderProvider,
      
      "from": dates[0],
      "to": dates[1],
    
      "period": message.period,
    };

    permutator.generate(schema, data => {
      const instruction = Object.assign
      (
        {}, 
        base, 
        { 
          parameters: Object.assign
          (
            {}, 
            data,
            { baseSymbol: symbols[1] }
          )
        }
      );

      // console.log(JSON.stringify(instruction));
      result.push(instruction);
    });
  });
});

console.log(result.length);
