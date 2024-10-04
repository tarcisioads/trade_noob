import BigNumber from "bignumber.js";
import { bingXOpenApi, divapAlertApi, getSymbol, API, API_LEVERAGE, API_ALERT_DIVAP_UPDATE, PERC_TP, PERC_TP_ALVO2 } from "./utils.js";

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function trade_long(alert, obj, uri) {
  const payloadLeverageLong = getPayloadLeverageLong(obj)
  const respLongLeverage = await bingXOpenApi(API_LEVERAGE.protocol, process.env.HOST, API_LEVERAGE.uri, API_LEVERAGE.method, payloadLeverageLong, process.env.API_KEY, process.env.API_SECRET)
  alert.leverage_long_result = respLongLeverage.data

  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadLong = getPayloadLong(obj)
  let respLong = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLong, process.env.API_KEY, process.env.API_SECRET)

  alert.open_trade_result = respLong.data

  let obj_long = JSON.parse(respLong.data);
  if ((respLong.status == 200) && (obj_long && obj_long.data && obj_long.data.order)) {
    let longInt = BigInt(obj_long.data.order.orderId);
    alert.trade_id = longInt.toString()
  }
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadLongTPAlvo2 = getPayloadTakeProfitLongAlvo2(obj)
  let respLongTPAlvo2 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLongTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_alvo2 = respLongTPAlvo2.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadLongTrailingStop = getPayloadLongTrailingStop(obj)
  let respLongTrailingStop = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLongTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_tailingstop = respLongTrailingStop.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

}

async function trade_short(alert, obj, uri) {
  const payloadLeverageShort = getPayloadLeverageShort(obj)
  const respShortLeverage = await bingXOpenApi(API_LEVERAGE.protocol, process.env.HOST, API_LEVERAGE.uri, API_LEVERAGE.method, payloadLeverageShort, process.env.API_KEY, process.env.API_SECRET)
  alert.leverage_short_result = respShortLeverage.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadShort = getPayloadShort(obj)
  let respShort = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShort, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_result = respShort.data

  let obj_short = JSON.parse(respShort.data);
  if ((respShort.status == 200) && (obj_short && obj_short.data && obj_short.data.order)) {
    let longInt = BigInt(obj_short.data.order.orderId);
    alert.trade_id_short = longInt.toString()
  }
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadShortTPAlvo2 = getPayloadTakeProfitShortAlvo2(obj)
  let respShortTPAlvo2 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShortTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_alvo2 = respShortTPAlvo2.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  let payloadShortTrailingStop = getPayloadShortTrailingStop(obj)
  let respShortTrailingStop = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShortTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_tailingstop = respShortTrailingStop.data

}

async function trades(alert, obj, uri) {
  if (obj.ls == "LONG") {
    await trade_long(alert, obj, uri)
  }
  if (obj.ls == "SHORT") {
    await trade_short(alert, obj, uri) 
  }
  alert.readed = true
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
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
    "price": obj.close.toNumber(),
    "stopPrice": obj.close.toNumber(),
    "quantity": getQuantityLong(obj).toNumber(),
    "stopLoss": {
      "type": "STOP_MARKET",
      "stopPrice": obj.stop.toNumber(),
      "price": obj.stop.toNumber(),
    }

  }
  payload.stopLoss = JSON.stringify(payload.stopLoss) + ""
  return payload
}


function getPayloadTakeProfitLongAlvo2(obj) {
  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "price": obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "stopPrice": obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).times(PERC_TP_ALVO2).dp(4).toNumber(),
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
    "activationPrice": obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "price": obj.diff.times(2).dp(5).toNumber(),
    "stopPrice": obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5).toNumber(),
    "quantity": getQuantityLong(obj).minus(getQuantityLong(obj).times(PERC_TP_ALVO2).dp(4)).dp(4).toNumber(),
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

export default trades;
