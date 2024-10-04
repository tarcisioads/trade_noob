import CryptoJS from "crypto-js";
import axios from "axios";
import BigNumber from "bignumber.js";

const MINUS_RANGE = BigNumber(0.9997)
const PLUS_RANGE = BigNumber(1.0007)
const ALVO1 = BigNumber(1)
const USDT_RISK = BigNumber(1.5)
const PERC_TP_ALVO2 = BigNumber(0.8)
const PERC_TP = BigNumber(0.5)


const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const API_ALERT_DIVAP = {
  "uri": "/alert/open",
  "method": "GET",
  "protocol": "https"
}
const API_ALERT_DIVAP_UPDATE = {
  "uri": "/alert",
  "method": "PUT",
}

const API = {
  "uri": "/openApi/swap/v2/trade/order",
  "method": "POST",
  "protocol": "https"
}

const API_POSITION = {
  "uri": "/openApi/swap/v2/user/positions",
  "method": "GET",
  "protocol": "https"
}

const API_OPEN_ORDERS = {
  "uri": "/openApi/swap/v2/trade/openOrders",
  "method": "GET",
  "protocol": "https"
}

const API_CANCELREPLACE = {
  "uri": "/openApi/swap/v1/trade/cancelReplace",
  "method": "POST",
  "protocol": "https"
}

const API_LEVERAGE = {
  "uri": "/openApi/swap/v2/trade/leverage",
  "method": "POST",
  "protocol": "https"
}



function getSymbol(par) {
  let symbol = par.replace("USDT.P,15", "-USDT")
  symbol = symbol.replace("USDT.P,1H", "-USDT")
  symbol = symbol.replace("TON-USDT", "TONCOIN-USDT")
  return symbol
}

function getParameters(payload, timestamp, urlEncode) {
  let parameters = ""
  console.log(payload)
  for (const key in payload) {
    console.log(key)
    if (urlEncode) {
      parameters += key + "=" + encodeURIComponent(payload[key]) + "&"
    } else {
      parameters += key + "=" + payload[key] + "&"
    }
  }
  if (parameters) {
    parameters = parameters.substring(0, parameters.length - 1)
    parameters = parameters + "&timestamp=" + timestamp
  } else {
    parameters = "timestamp=" + timestamp
  }
  return parameters
}

async function bingXOpenApi(protocol, host, path, method, payload, API_KEY, API_SECRET) {
  console.log(payload)
  const timestamp = new Date().getTime()
  const sign = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(getParameters(payload, timestamp), API_SECRET))
  const url = protocol + "://" + host + path + "?" + getParameters(payload, timestamp, true) + "&signature=" + sign
  console.log("protocol:", protocol)
  console.log("method:", method)
  console.log("host:", host)
  console.log("path:", path)
  console.log("parameters:", getParameters(payload, timestamp))
  console.log("sign:", sign)
  console.log(method, url)
  const config = {
    method: method,
    url: url,
    headers: {
      'X-BX-APIKEY': API_KEY,
    },
    transformResponse: (resp) => {
      //!!!!!!!very important
      //Notice:in nodeJS when you converts original resp(string) to json, order id is a big-int in some response
      //it may have big-int issue, will be transformed automatically
      //for example:  order id: 172998235239792314304 -be transformed automatically to-->172998235239792314300
      //if you find something wrong with order id like 'order not exist' or found the order id suffix with 00 or more 0, chould be the reason 
      //then can print the original response like below to check the origianl order id 
      console.log(resp);
      return resp;
    }
  };
  const resp = await axios(config);
  console.log(resp.status);
  console.log(resp.data);
  //!!!!!!!very important
  //if there is a Big int ,can transfer it like this below:
  // let jsonString = '{"longInt":1807651653281644544}';
  // console.log("original data:",jsonString)
  // let obj = JSON.parse(jsonString);
  // console.log("JSON.parse:",obj)
  // let longInt = BigInt(obj.longInt);
  // console.log("to longInt:",longInt.toString())
  return resp
}

async function divapAlertApi(protocol, host, path, method, payload) {
  const timestamp = new Date().getTime()
  const url = protocol + "://" + host + path
  console.log("protocol:", protocol)
  console.log("method:", method)
  console.log("host:", host)
  console.log("path:", path)
  console.log("payload:", payload)
  console.log(method, url)
  const config = {
    method: method,
    url: url,
    data: payload,
    transformResponse: (resp) => {
      console.log(resp);
      return resp;
    }
  };
  const resp = await axios(config);
  console.log(resp.status);
  console.log(resp.data);
  let jsonString = resp.data
  let obj = JSON.parse(jsonString);
  return obj
}


export { sleep, getSymbol, bingXOpenApi, divapAlertApi, getParameters, API, API_POSITION, API_OPEN_ORDERS, API_CANCELREPLACE, API_LEVERAGE, MINUS_RANGE, PLUS_RANGE, API_ALERT_DIVAP, API_ALERT_DIVAP_UPDATE, USDT_RISK, ALVO1, PERC_TP, PERC_TP_ALVO2 } 
