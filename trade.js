import BigNumber from "bignumber.js";
import { sleep, bingXOpenApi, divapAlertApi, getSymbol, API, API_LEVERAGE, API_ALERT_DIVAP_UPDATE, PERC_TP, PERC_TP_ALVO2 } from "./utils.js";

async function openTrades(alert, obj, uri, positions) {
  if (obj.ls == "LONG") {
    await trade_long(alert, obj, uri, positions)
  }
  if (obj.ls == "SHORT") {
    await trade_short(alert, obj, uri, positions) 
  }
  alert.readed = true
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)
}


async function trade_long(alert, obj, uri, positions) {
  hasLongs = positions.filter((position) => position.live && position.symbol == getSymbol(obj.par) && position.position.positionSide == "LONG").length > 0
  if (hasLongs)
    return

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

  let payloadLongTPAlvo1 = getPayloadTakeProfitLongAlvo1(obj)
  let respLongTPAlvo1 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLongTPAlvo1, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_alvo1 = respLongTPAlvo1.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)
  
  if (obj.second_target){
    let payloadLongTPAlvo2 = getPayloadTakeProfitLongAlvo2(obj)
    let respLongTPAlvo2 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLongTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
    alert.open_trade_long_alvo2 = respLongTPAlvo2.data
    await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

    await sleep(1000 * 5)

  }

  let payloadLongTrailingStop = getPayloadLongTrailingStop(obj)
  let respLongTrailingStop = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadLongTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_long_tailingstop = respLongTrailingStop.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

}

async function trade_short(alert, obj, uri) {

  const hasShorts = positions.filter((position) => position.live && position.symbol == getSymbol(obj.par) && position.position.positionSide == "SHORT").length > 0
  if (hasShorts)
    return


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

  let payloadShortTPAlvo1 = getPayloadTakeProfitShortAlvo1(obj)
  let respShortTPAlvo1 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShortTPAlvo1, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_alvo1 = respShortTPAlvo1.data
  await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

  await sleep(1000 * 5)

  if (obj.second_target){
    let payloadShortTPAlvo2 = getPayloadTakeProfitShortAlvo2(obj)
    let respShortTPAlvo2 = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShortTPAlvo2, process.env.API_KEY, process.env.API_SECRET)
    alert.open_trade_short_alvo2 = respShortTPAlvo2.data
    await divapAlertApi(API_ALERT_DIVAP_UPDATE.protocol, process.env.HOST_ALERT_DIVAP, uri, API_ALERT_DIVAP_UPDATE.method, alert)

    await sleep(1000 * 5)
  }

  let payloadShortTrailingStop = getPayloadShortTrailingStop(obj)
  let respShortTrailingStop = await bingXOpenApi(API.protocol, process.env.HOST, API.uri, API.method, payloadShortTrailingStop, process.env.API_KEY, process.env.API_SECRET)
  alert.open_trade_short_tailingstop = respShortTrailingStop.data

}

function getQuantityLong(obj) {
  const leverage = getLeverageLong(obj)
  const percStop = obj.diff.div(obj.close)
  const margem = USDT_RISK.div(percStop.times(leverage))
  const quantity = margem.div(obj.close).times(leverage)
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

function getPayloadTakeProfitLongAlvo1(obj) {
  let price = BigNumber(0)
  if (obj.first_target) {
    price = BigNumber(obj.first_target)
  }else{
    price = obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5)
  }
  let perc = PERC_TP
  if (!obj.second_target){
    perc = perc.plus(PERC_TP_ALVO2.times(PERC_TP)) 
  }

  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": price.toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": getQuantityLong(obj).times(perc).dp(4).toNumber(),
  }
  return payload
}

function getPayloadTakeProfitLongAlvo2(obj) {
  let price = 0
  if (obj.second_target) {
    price = BigNumber(obj.second_target)
  }else{
    price = obj.close.plus(obj.diff.times(2)).times(MINUS_RANGE).dp(5)
  }

  let quantity = getQuantityLong(obj)
  quantity = quantity.minus(quantity.times(PERC_TP).db(4)).times(PERC_TP_ALVO2).dp(4)

  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": price.toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": quantity.toNumber(),
  }
  return payload
}

function getPayloadLongTrailingStop(obj) {
  let price = BigNumber(0)
  if (obj.first_target) {
    price = BigNumber(obj.first_target)
  }else{
    price = obj.close.plus(obj.diff).times(MINUS_RANGE).dp(5)
  }

  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "SELL",
    "positionSide": "LONG",
    "type": "TRAILING_STOP_MARKET",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": obj.diff.times(2).dp(5).toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": getQuantityLong(obj).minus(getQuantityLong(obj).times(PERC_TP).dp(4)).dp(4).toNumber(),
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
    "activationPrice": obj.close.toNumber(),
    "price": obj.close.toNumber(),
    "stopPrice": obj.close.toNumber(),
    "quantity": getQuantityShort(obj).toNumber(),
    "stopLoss": {
      "type": "STOP_MARKET",
      "stopPrice": obj.stop.toNumber(),
      "price": obj.stop.toNumber(),
      "workingType": "CONTRACT_PRICE",
    }
  }
  payload.stopLoss = JSON.stringify(payload.stopLoss) + ""
  return payload
}


function getPayloadTakeProfitShortAlvo1(obj) {
  let price = BigNumber(0)
  if (obj.first_target) {
    price = BigNumber(obj.first_target)
  }else{
    price = obj.close.plus(obj.diff).times(PLUS_RANGE).dp(5)
  }
  let perc = PERC_TP
  if (!obj.second_target){
    perc = perc.plus(PERC_TP_ALVO2.times(PERC_TP)) 
  }


  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": price.toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": getQuantityShort(obj).times(perc).dp(4).toNumber(),
  }
  return payload
}



function getPayloadTakeProfitShortAlvo2(obj) {
  let price = 0
  if (obj.second_target) {
    price = BigNumber(obj.second_target)
  }else{
    price = obj.close.plus(obj.diff.times(2)).times(MINUS_RANGE).dp(5)
  }

  let quantity = getQuantityShort(obj)
  quantity = quantity.minus(quantity.times(PERC_TP).db(4)).times(PERC_TP_ALVO2).dp(4)

  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "TRIGGER_LIMIT",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": price.toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": quantity.toNumber(),
  }
  return payload
}

function getPayloadShortTrailingStop(obj) {
  let price = BigNumber(0)
  if (obj.first_target) {
    price = BigNumber(obj.first_target)
  }else{
    price = obj.close.minus(obj.diff).times(MINUS_RANGE).dp(5)
  }

  let payload = {
    "symbol": getSymbol(obj.par),
    "side": "BUY",
    "positionSide": "SHORT",
    "type": "TRAILING_STOP_MARKET",
    "workingType": "CONTRACT_PRICE",
    "activationPrice": price.toNumber(),
    "price": obj.diff.times(2).dp(5).toNumber(),
    "stopPrice": price.toNumber(),
    "quantity": getQuantityShort(obj).minus(getQuantityShort(obj).times(PERC_TP).dp(4)).dp(4).toNumber(),
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

export default openTrades;
