"use strict";

/** Client-side of groupchat. */

const urlParts = document.URL.split("/");
const roomName = urlParts[urlParts.length - 1];
const ws = new WebSocket(`ws://localhost:3000/chat/${roomName}`);


const name = prompt("Username? (no spaces)");


/** called when connection opens, sends join info to server. */

ws.onopen = function (evt) {
  console.log("open", evt);

  let data = { type: "join", name: name };
  ws.send(JSON.stringify(data));
};


/** called when msg received from server; displays it. */

ws.onmessage = function (evt) {
  console.log("message", evt);
  let msg = JSON.parse(evt.data);
  let $item = document.createElement("li");
  console.log(msg.name);



  if (msg.type === "note") {
    $item.innerHTML = `<i>${msg.text}</i>`;
  } else if (msg.type === "chat") {
    $item.innerHTML = `<b>${msg.name}: </b>${msg.text}`;
  } else {
    return console.error(`bad message: ${msg}`);
  }


  document.querySelector("#messages").appendChild($item);
};


/** called on error; logs it. */

ws.onerror = function (evt) {
  console.error(`err ${evt}`);
};


/** called on connection-closed; logs it. */

ws.onclose = function (evt) {
  console.log("close", evt);
};

/**Given message content, formats the message into an object with key
 * type
 *
 * Returns { type }
 */

function formatMsg(input) {
  let type;
  let text;
  let recipient;

  if(input === "/joke") {
    type = "get-joke";
    text = "";
  }

  else if(input === "/members") {
    type = "get-members";
    text = "";
  }

  else if(input.startsWith("/priv")) {
    const splitInput = input.split(" ");
    type = "send-priv-msg";
    text = splitInput.slice(2).join(" ");
    recipient = splitInput[1];
  }

  else if(input.startsWith("/name")) {
    const splitInput = input.split(" ");
    type = "change-username";
    text = splitInput[1];
  }

  else {
    type = "chat";
    text = input;
    recipient = "";
  }

  return { type, text, recipient };
}

/** send message when button pushed. */

function sendMessage(evt) {
  evt.preventDefault();

  const input = document.querySelector("#m").value;

  const data = formatMsg(input);
  ws.send(JSON.stringify(data));

  document.querySelector("#m").value = "";
}

document.querySelector("form").addEventListener("submit", sendMessage);
