import WebSocket from "ws";
import zlib from "zlib";
import BigNumber from "bignumber.js";

function createWSHandlerAlert(PATH) {
  let socket;
  let receivedMessage = "";

  const PATH_WS = "wss://app.notabrasil.com.br/test_divap";

  function init() {
    socket = new WebSocket(PATH_WS);
    socket.on('open', onOpen);
    socket.on('message', onMessage);
    socket.on('error', onError);
    socket.on('close', onClose);
  }

  function onOpen() {
    console.log("WS alert connected");
  }

  function onError(error) {
    console.log("WS alert error:", error);
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
    console.log("WS alert closed");
    receivedMessage = "init"
  }

  function send() {
    if (socket.readyState !== WebSocket.CLOSED)
      socket.send('Ping');
  }


  return {
    init,
    send,
    onOpen,
    onError,
    onMessage,
    onClose,
    getSocket: () => socket,
    getReceivedMessage: () => receivedMessage,
    setReceivedMessage: (value) => receivedMessage = value,
  };
}

export default createWSHandlerAlert;
