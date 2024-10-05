import WebSocket from "ws";
import zlib from "zlib";
import BigNumber from "bignumber.js";


function createWSHandlerPrice(position, stopOrder, MINUS_RANGE, PLUS_RANGE, ALVO1) {
  let socket;
  let receivedMessage = "";
  let targetHitShort = false;
  let targetHitLong = false;

  const path = "wss://open-api-swap.bingx.com/swap-market";
  const CHANNEL = {
    "id": "24dd0e35-56a4-4f7a-af8a-394c7060909c",
    "reqType": "sub",
    "dataType": `${position.symbol}@lastPrice`
  };


  function init() {
    socket = new WebSocket(path);
    socket.on('open', onOpen);
    socket.on('message', onMessage);
    socket.on('error', onError);
    socket.on('close', onClose);
  }

  function onOpen() {
    console.log("WebSocket connected");
    socket.send(JSON.stringify(CHANNEL));
  }

  function onError(error) {
    console.log("WebSocket error:", error);
  }

  function onMessage(message) {
    const buf = Buffer.from(message);
    const decodedMsg = zlib.gunzipSync(buf).toString('utf-8');
    console.log(decodedMsg);
    if (decodedMsg === "Ping") {
      socket.send('Pong');
      console.log('Pong');
      receivedMessage = decodedMsg;
      return
    }
    if (targetHitLong) {
      console.log(`${position.symbol} priceAlvo1 long hit`)
    }
    if (targetHitShort) {
      console.log(`${position.symbol} priceAlvo1 short hit`)
    }
    receivedMessage = decodedMsg;
    let obj = JSON.parse(decodedMsg);
    if (!position) return;
    if (!obj.data) return;
    let currentPrice = BigNumber(obj.data.c)
    let entryPrice = BigNumber(position.avgPrice)
    let stopPrice = BigNumber(position.avgPrice)
    if (stopOrder){
      stopPrice = BigNumber(stopOrder.stopPrice)
    } 
    if (position.positionSide == "LONG") {
      let dif = entryPrice.minus(stopPrice)
      let priceAlvo1 = entryPrice.plus(dif.times(ALVO1).dp(5)).times(MINUS_RANGE).dp(5).toNumber()
      console.log(position.symbol, position.positionSide, currentPrice, priceAlvo1)
      if (currentPrice >= priceAlvo1) {
        targetHitLong = true
      }
    } else {
      entryPrice = entryPrice.times(PLUS_RANGE).dp(5)
      let dif = stopPrice.minus(entryPrice)
      let priceAlvo1 = entryPrice.minus(dif.times(ALVO1).dp(5)).times(PLUS_RANGE).dp(5).toNumber()
      console.log(position.positionSide, currentPrice, priceAlvo1)
      if (currentPrice <= priceAlvo1) {
        targetHitShort = true
      }
    }


  }

  function onClose() {
    console.log("WebSocket closed");
  }

  return {
    init,
    onOpen,
    onError,
    onMessage,
    onClose,
    getSocket: () => socket,
    getReceivedMessage: () => receivedMessage,
    getTargetHit: () => targetHitLong || targetHitShort
  };
}

export default createWSHandlerPrice;
