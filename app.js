import dotenv from "dotenv";
import BigNumber from "bignumber.js";
import createWSHandlerPrice from "./position_price.js";
import createWSHandlerAlert from "./position_alert.js";
import { sleep, bingXOpenApi, divapAlertApi, API, API_POSITION, API_OPEN_ORDERS, API_CANCELREPLACE, MINUS_RANGE, PLUS_RANGE, API_ALERT_DIVAP, API_ALERT_DIVAP_UPDATE, ALVO1 } from "./utils.js";
import openTrades from "./trade.js";

function getNewWSHandlerPrice(position, stopLoss) {
  const webSocketHandler = new createWSHandlerPrice(position, stopLoss, MINUS_RANGE, PLUS_RANGE, ALVO1);
  webSocketHandler.init();
  console.log("WebSocket Price created for position:", position.symbol);
  return webSocketHandler;
}

function getNewWSHandlerAlert() {
  const webSocketHandler = new createWSHandlerAlert();
  webSocketHandler.init();
  console.log("WebSocket created for alerts");
  return webSocketHandler;
}

async function main() {
  let positions = []
  while (true) {
    console.log(wsHandlerAlert.getReceivedMessage())

    await sleep(1000 * 10)

    let resp = await bingXOpenApi(API_POSITION.protocol, process.env.HOST, API_POSITION.uri, API_POSITION.method, null, process.env.API_KEY, process.env.API_SECRET)
    console.log(resp.data)
    positions.map((position) => {
      position.live = false
    })

    await sleep(1000 * 5)

    let listOpenOrders =[]
    if (positions && positions.length > 0) {
      listOpenOrders = await getOpenOrders()
    }

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
            web_socket: getNewWSHandlerPrice(item, stop_order),
            stop_order: stop_order,
          }
          positions.push(position)
        }
        if (position.web_socket.getTargetHit()) {
          setStopOnEntry(position)
        }
        position.live = true
      })

      positions.map((position) => {
        if (!position.live) {
          position.web_socket.getSocket().close()
        }
      })

      positions = positions.filter((position) => position.live)
    }


    if ((!wsHandlerAlert.getReceivedMessage()) || (wsHandlerAlert.getReceivedMessage() == "")) {
      wsHandlerAlert.send();
      continue;
    }

    if (wsHandlerAlert.getReceivedMessage() == "recebido!") {
      wsHandlerAlert.setReceivedMessage(null)
      continue;
    }

    if (wsHandlerAlert.getReceivedMessage() == "init") {
      wsHandlerAlert.init();
      wsHandlerAlert.setReceivedMessage(null)
      continue;
    }

    wsHandlerAlert.setReceivedMessage(null)

    let alerts = await divapAlertApi(API_ALERT_DIVAP.protocol, process.env.HOST_ALERT_DIVAP, API_ALERT_DIVAP.uri, API_ALERT_DIVAP.method)
    for (let alert of alerts) {
      if (alert.readed == true)
        continue

      const uri = `${API_ALERT_DIVAP_UPDATE.uri}/${alert.id}`
      if (!alert.content) {
        alert.readed = true
        await divapAlertApi(API_ALERT_DIVAP.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
        continue
      }
      const content = alert.content
      let obj = JSON.parse(content);
      if (!obj) {
        alert.readed = true
        await divapAlertApi(API_ALERT_DIVAP.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
        continue
      }

      obj.close = BigNumber(obj.close)
      obj.stop = BigNumber(obj.stop)
      if (obj.close.gte(obj.stop)) {
        obj.diff = obj.close.minus(obj.stop).dp(5);
      } else {
        obj.diff = obj.stop.minus(obj.close).dp(5);
      }

      await sleep(1000 * 5)

      await openTrades(alert, obj, uri, positions)

    }

  }
}

async function getOpenOrders() {
  let resp = await bingXOpenApi(API_OPEN_ORDERS.protocol, process.env.HOST, API_OPEN_ORDERS.uri, API_OPEN_ORDERS.method, null, process.env.API_KEY, process.env.API_SECRET)
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
      let resp = await bingXOpenApi(API_CANCELREPLACE.protocol, process.env.HOST, API_CANCELREPLACE.uri, API_CANCELREPLACE.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }else {
      let resp = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }
    // alert.open_trade_long_alvo1 = resp.data
    // await divapAlertApi(API_ALERT_DIVAP.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
  } else if (position.position.positionSide == "SHORT") {
    let payload = getPayloadStopEntradaShortAlvo1(position)
    if (position.stop_order) {
      let resp = await bingXOpenApi(API_CANCELREPLACE.protocol, process.env.HOST, API_CANCELREPLACE.uri, API_CANCELREPLACE.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }else {
      let resp = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payload, process.env.API_KEY, process.env.API_SECRET)
    }
    // alert.open_trade_short_alvo1 = resp.data
    // await divapAlertApi(API_ALERT_DIVAP.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
  }

}

function getPayloadStopEntradaLongAlvo1(position) {
  let entryPrice = BigNumber(position.position.avgPrice)
  let stopPayTax = entryPrice.times(PLUS_RANGE).dp(5)
  let payload = {
    "symbol": position.position.symbol,
    "side": "SELL",
    "positionSide": "LONG",
    "type": "STOP_MARKET",
    "price": stopPayTax.toNumber(),
    "stopPrice": stopPayTax.toNumber(),
    "quantity": position.position.availableAmt,
  }
  if (position.stop_order) {
    const orderId = BigInt(position.stop_order.orderId)
    payload.cancelReplaceMode = "STOP_ON_FAILURE"
    payload.cancelOrderId = orderId
  }
  return payload
}

function getPayloadStopEntradaShortAlvo1(position) {
  let entryPrice = BigNumber(position.position.avgPrice)
  let stopPayTax = entryPrice.times(MINUS_RANGE).dp(5)
 
  let payload = {
    "symbol": position.position.symbol,
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "STOP_MARKET",
    "price": stopPayTax.toNumber(),
    "stopPrice": stopPayTax.toNumber(),
    "quantity": position.position.availableAmt,
  }
  if (position.stop_order) {
    const orderId = BigInt(position.stop_order.orderId)
    payload.cancelReplaceMode = "STOP_ON_FAILURE"
    payload.cancelOrderId = orderId
  }
  return payload
}



dotenv.config()
const wsHandlerAlert = getNewWSHandlerAlert()
main().catch(console.err);

