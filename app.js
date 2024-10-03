// npm install crypto-js -s 
// npm install axios -s 
import CryptoJS from "crypto-js";
import axios from "axios";
import dotenv from "dotenv";
import BigNumber from "bignumber.js";
import WebSocket from "ws";
import createWebSocketHandler from "./position_price.js";

const PATH_WS = "wss://app.notabrasil.com.br/test_divap";

let socket;
let receivedMessage = "";

function init() {
  socket = new WebSocket(PATH_WS);
  socket.on('open', onOpen);
  socket.on('message', onMessage);
  socket.on('error', onError);
  socket.on('close', onClose);
}

function onOpen() {
  console.log("WebSocket connected");
  // socket.send("Ping");
}

function onError(error) {
  console.log("WebSocket error:", error);
}

function onMessage(message) {
  const buf = Buffer.from(message);
  const decodedMsg = buf.toString('utf-8');
  console.log(decodedMsg);
  if (decodedMsg === "Ping") {
    socket.send('Pong');
    console.log('Pong');
  }
  receivedMessage = decodedMsg;
}

function onClose() {
  console.log("WebSocket closed");
  receivedMessage = "init"
}

function send() {
  if (socket.readyState !== WebSocket.CLOSED)
    socket.send('Ping');
}



init();


const MINUS_RANGE = BigNumber(0.9997)
const PLUS_RANGE = BigNumber(1.0007)
const ALVO1_DIVAP = BigNumber(0.618)
const USDT_RISK = BigNumber(1.5)
const PERC_ALVO2 = BigNumber(0.5)
const PERC_TP = BigNumber(2.618)
const HOST_ALERT_DIVAP = "app.notabrasil.com.br/test_divap"
const API_ALERT_DIVAP = {
  "uri": "/alert/open",
  "method": "GET",
  "protocol": "https"
}
const API_ALERT_DIVAP_UPDATE = {
  "uri": "/alert",
  "method": "PUT",
}

// const HOST = "open-api.bingx.com"
const HOST = "open-api-vst.bingx.com"
const API = {
  "uri": "/openApi/swap/v2/trade/order",
  "method": "POST",
  "protocol": "https"
}
const API_LEVERAGE = {
  "uri": "/openApi/swap/v2/trade/leverage",
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

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function trades(alert, obj, uri) {
  const payloadLeverageLong = getPayloadLeverageLong(obj)
  const respLongLeverage = await bingXOpenApiTest(API_LEVERAGE.protocol, HOST, API_LEVERAGE.uri, API_LEVERAGE.method, payloadLeverageLong, process.env.API_KEY, process.env.API_SECRET)
  alert.leverage_long_result = respLongLeverage.data

  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadLong = getPayloadLong(obj)
  let respLong = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadLong, process.env.API_KEY, process.env.API_SECRET)

  alert.open_trade_result = respLong.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  let obj_long = JSON.parse(respLong.data);
  if ((respLong.status == 200) && (obj_long && obj_long.data && obj_long.data.order)) {
    let longInt = BigInt(obj_long.data.order.orderId);
    alert.trade_id = longInt.toString()
  }

  await sleep(1000 * 5)

  const payloadLeverageShort = getPayloadLeverageShort(obj)
  const respShortLeverage = await bingXOpenApiTest(API_LEVERAGE.protocol, HOST, API_LEVERAGE.uri, API_LEVERAGE.method, payloadLeverageShort, process.env.API_KEY, process.env.API_SECRET)
  alert.leverage_short_result = respShortLeverage.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadShort = getPayloadShort(obj)
  let respShort = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadShort, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_result = respShort.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)


  await sleep(1000 * 5)

  let payloadLongTPAlvo2 = getPayloadTakeProfitLongAlvo2(obj)
  let respLongTPAlvo2 = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadLongTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_alvo2 = respLongTPAlvo2.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)


  await sleep(1000 * 5)

  let payloadLongTrailingStop = getPayloadLongTrailingStop(obj)
  let respLongTrailingStop = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadLongTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_tailingstop = respLongTrailingStop.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  let obj_short = JSON.parse(respShort.data);
  if ((respShort.status == 200) && (obj_short && obj_short.data && obj_short.data.order)) {
    let longInt = BigInt(obj_short.data.order.orderId);
    alert.trade_id_short = longInt.toString()
  }

  await sleep(1000 * 5)

  let payloadShortTPAlvo2 = getPayloadTakeProfitShortAlvo2(obj)
  let respShortTPAlvo2 = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadShortTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_alvo2 = respShortTPAlvo2.data
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadShortTrailingStop = getPayloadShortTrailingStop(obj)
  let respShortTrailingStop = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payloadShortTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_tailingstop = respShortTrailingStop.data

  alert.readed = true
  await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

}

function getNewWebSocket(position, stopLoss) {
  const webSocketHandler = new createWebSocketHandler(position, stopLoss, MINUS_RANGE, PLUS_RANGE, ALVO1_DIVAP);
  webSocketHandler.init();
  console.log("WebSocket created for position:", position.symbol);
  return webSocketHandler;
}

async function main() {
  let positions = []
  while (true) {
    console.log(receivedMessage)

    await sleep(1000 * 10)

    let resp = await bingXOpenApiTest(API_POSITION.protocol, HOST, API_POSITION.uri, API_POSITION.method, null, process.env.API_KEY, process.env.API_SECRET)
    console.log(resp.data)
    await positions.map((position) => {
      position.live = false
    })

    await sleep(1000 * 5)

    let listOpenOrders = await getOpenOrders()

    console.log(resp.status)
    if (resp.status == 200) {
      let list = JSON.parse(resp.data);
      list = list.data
      console.log(list)
      await list.map((item) => {
        let position = positions.find((position) => position.symbol == item.symbol)
        if (!position) {
          const stop_order = getStopOrder(listOpenOrders, item.symbol, item.positionSide)

          position = {
            symbol: item.symbol,
            position: item,
            web_socket: getNewWebSocket(item, stop_order),
            stop_order: stop_order,
          }
          positions.push(position)
        }
        if (position.web_socket.getTargetHit()) {
          setStopOnEntry(position)
        }
        position.live = true
      })

      await positions.map((position) => {
        if (!position.live) {
          position.web_socket.getSocket().close()
        }
      })

      positions = positions.filter((position) => position.live)
    }


    if ((!receivedMessage) || (receivedMessage == "")) {
      send();
      continue;
    }

    if (receivedMessage == "recebido!") {
      receivedMessage = null
      continue;
    }

    if (receivedMessage == "init") {
      init();
      receivedMessage = null
      continue;
    }

    receivedMessage = null

    let alerts = await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, API_ALERT_DIVAP.uri, API_ALERT_DIVAP.method)
    for (let alert of alerts) {
      if (alert.readed == true)
        continue

      const uri = `${API_ALERT_DIVAP_UPDATE.uri}/${alert.id}`
      if (!alert.content) {
        alert.readed = true
        await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
        continue
      }
      const content = alert.content
      let obj = JSON.parse(content);
      if (!obj) {
        alert.readed = true
        await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
        continue
      }

      obj.high = BigNumber(obj.high)
      obj.low = BigNumber(obj.low)
      obj.diff = obj.high.minus(obj.low).dp(5);

      await sleep(1000 * 5)

      await trades(alert, obj, uri)

    }

  }
}

async function getOpenOrders() {
  let resp = await bingXOpenApiTest(API_OPEN_ORDERS.protocol, HOST, API_OPEN_ORDERS.uri, API_OPEN_ORDERS.method, null, process.env.API_KEY, process.env.API_SECRET)
  if (resp.status == 200)  {
    let list = JSON.parse(resp.data);
    list = list.data.orders
    console.log(list)
    return list
  }
  return []
}

function getStopOrder(list, symbol, positionSide) {
  for (let order of list) {
    if (order.symbol == symbol && order.positionSide == positionSide && order.type == "STOP_MARKET") {
      return order
    }
  }
  return null
}

async function setStopOnEntry(position) {
  let entryPrice = BigNumber(position.position.avgPrice)
  let stopPrice = BigNumber(0)
  if (position.stop_order) {
    stopPrice = BigNumber(position.stop_order.stopPrice)
  }
  if (entryPrice.toNumber() == stopPrice.toNumber()) return

  if (position.position.positionSide == "LONG") {
    let payload = getPayloadStopEntradaLongAlvo1(position)
    if (position.stop_order) {
      let resp = await bingXOpenApiTest(API_CANCELREPLACE.protocol, HOST, API_CANCELREPLACE.uri, API_CANCELREPLACE.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }else {
      let resp = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }
    // alert.open_trade_long_alvo1 = resp.data
    // await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
  } else {
    let payload = getPayloadStopEntradaShortAlvo1(position)
    if (position.stop_order) {
      let resp = await bingXOpenApiTest(API_CANCELREPLACE.protocol, HOST, API_CANCELREPLACE.uri, API_CANCELREPLACE.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }else {
      let resp = await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }
    // alert.open_trade_short_alvo1 = resp.data
    // await divapAlertApi(API_ALERT_DIVAP.protocol, HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
  }

}

function getQuantityLong(obj) {
  const leverage = getLeverageLong(obj)
  const percStop = obj.diff.div(obj.high)
  const margem = USDT_RISK.div(percStop.times(leverage))
  const quantity = margem.div(obj.high).times(leverage)
  return quantity.dp(4)
}

function getPayloadLong(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "LONG",
    "type": "TRIGGER_MARKET",
    "activationPrice": obj.high.times(PLUS_RANGE).dp(5).toNumber(),
    "price": obj.high.times(PLUS_RANGE).dp(5).toNumber(),
    "stopPrice": obj.high.times(PLUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).toNumber(),
    "takeProfit": {
      "type": "TAKE_PROFIT_MARKET",
      "stopPrice": obj.high.plus(obj.diff.times(PERC_TP)).dp(5).toNumber(),
      "price": obj.high.plus(obj.diff.times(PERC_TP)).dp(5).toNumber(),
    },
    "stopLoss": {
      "type": "STOP_MARKET",
      "stopPrice": obj.low.times(MINUS_RANGE).dp(5).toNumber(),
      "price": obj.low.times(MINUS_RANGE).dp(5).toNumber(),
    }

  }
  payload.takeProfit = JSON.stringify(payload.takeProfit) + ""
  payload.stopLoss = JSON.stringify(payload.stopLoss) + ""
  return payload
}

function getPayloadStopEntradaLongAlvo1(position) {
  let payload = {
    "symbol": position.position.symbol,
    "side": "SELL",
    "positionSide": "LONG",
    "type": "STOP_MARKET",
    "price": position.position.avgPrice,
    "stopPrice": position.position.avgPrice,
    "quantity": position.position.availableAmt,
  }
  if (position.stop_order) {
    const orderId = BigInt(position.stop_order.orderId)
    payload.cancelReplaceMode = "STOP_ON_FAILURE"
    payload.cancelOrderId = orderId
  }
  return payload
}


function getPayloadTakeProfitLongAlvo2(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": obj.high.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "price": obj.high.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "stopPrice": obj.high.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).times(PERC_ALVO2).dp(4).toNumber(),
  }
  return payload
}

function getPayloadLongTrailingStop(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRAILING_STOP_MARKET",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": obj.high.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "price": obj.diff.times(2).dp(5).toNumber(),
    "stopPrice": obj.high.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).minus(getQuantityLong(obj).times(PERC_ALVO2).dp(4)).dp(4).toNumber(),
  }
  return payload
}



function getQuantityShort(obj) {
  const leverage = getLeverageShort(obj)
  const percStop = obj.diff.div(obj.high)
  const margem = USDT_RISK.div(percStop.times(leverage))
  const quantity = margem.div(obj.low).times(leverage).dp(4)
  return quantity
}

function getPayloadShort(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "SHORT",
    "type": "TRIGGER_MARKET",
    "activationPrice": obj.low.times(MINUS_RANGE).dp(5).toNumber(),
    "price": obj.low.times(MINUS_RANGE).dp(5).toNumber(),
    "stopPrice": obj.low.times(MINUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityShort(obj).toNumber(),
    "takeProfit": {
      "type": "TAKE_PROFIT_MARKET",
      "stopPrice": obj.low.minus(obj.diff.times(PERC_TP)).dp(5).toNumber(),
      "price": obj.low.minus(obj.diff.times(PERC_TP)).dp(5).toNumber(),
      "workingType": "CONTRACT_PRICE",
    },
    "stopLoss": {
      "type": "STOP_MARKET",
      "stopPrice": obj.high.times(PLUS_RANGE).dp(5).toNumber(),
      "price": obj.high.times(PLUS_RANGE).dp(5).toNumber(),
      "workingType": "CONTRACT_PRICE",
    }
  }
  payload.takeProfit = JSON.stringify(payload.takeProfit) + ""
  payload.stopLoss = JSON.stringify(payload.stopLoss) + ""
  return payload
}

function getPayloadStopEntradaShortAlvo1(position) {
  let payload = {
    "symbol": position.position.symbol,
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "STOP_MARKET",
    "price": position.position.avgPrice,
    "stopPrice": position.position.avgPrice,
    "quantity": position.position.availableAmt,
  }
  if (position.stop_order) {
    const orderId = BigInt(position.stop_order.orderId)
    payload.cancelReplaceMode = "STOP_ON_FAILURE"
    payload.cancelOrderId = orderId
  }
  return payload
}

function getPayloadTakeProfitShortAlvo2(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": obj.low.minus(obj.diff).times(PLUS_RANGE).dp(5).toNumber(),
    "price": obj.low.minus(obj.diff).times(PLUS_RANGE).dp(5).toNumber(),
    "stopPrice": obj.low.minus(obj.diff).times(PLUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityShort(obj).times(PERC_ALVO2).dp(4).toNumber(),
  }
  return payload
}

function getPayloadShortTrailingStop(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "TRAILING_STOP_MARKET",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": obj.low.minus(obj.diff).times(PLUS_RANGE).dp(5).toNumber(),
    "price": obj.diff.times(2).dp(5).toNumber(),
    "stopPrice": obj.low.minus(obj.diff).times(PLUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).minus(getQuantityLong(obj).times(PERC_ALVO2).dp(4)).dp(4).toNumber(),
  }
  return payload
}



function getLeverageLong(obj) {
  let leverage = BigNumber(1).div(obj.diff.div(obj.high));
  leverage = leverage.minus(leverage.times(0.3))
  leverage = Math.ceil(leverage.toNumber())
  leverage = leverage > 50 ? 50 : leverage
  leverage = obj.par.includes("TONUSDT") ? 20 : leverage

  // const leverage = DEFAULT_LEVERAGE
  return leverage

}

function getPayloadLeverageLong(obj) {
  const leverage = getLeverageLong(obj)
  const timestamp = new Date().getTime()

  let payload = {
    "leverage": leverage,
    "side": "LONG",
    "symbol": getSymbol(obj.par),
    "timestamp": timestamp,
  }
  return payload
}

function getLeverageShort(obj) {
  let leverage = BigNumber(1).div(obj.diff.div(obj.high));
  leverage = leverage.minus(leverage.times(0.2))
  leverage = Math.ceil(leverage.toNumber())
  leverage = leverage > 50 ? 50 : leverage
  leverage = obj.par.includes("TONUSDT") ? 20 : leverage
  // let leverage = DEFAULT_LEVERAGE
  return leverage

}

function getPayloadLeverageShort(obj) {
  const leverage = getLeverageShort(obj)
  const timestamp = new Date().getTime()
  let payload = {
    "leverage": leverage,
    "side": "SHORT",
    "symbol": getSymbol(obj.par),
    "timestamp": timestamp,
  }
  return payload
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

dotenv.config()
main().catch(console.err);

async function bingXOpenApiTest(protocol, host, path, method, payload, API_KEY, API_SECRET) {
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
