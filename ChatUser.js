"use strict";

const { json } = require("express");
/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");
const JOKE_BASE_URL = "https://icanhazdadjoke.com/";

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /**Sends request to joke API, sends back joke as server to the user only */

  async handleJoke() {
    const resp = await fetch(`${JOKE_BASE_URL}/`,
      {
        headers: { "Accept": "application/json" }
      });
    const data = await resp.json();

    this.send(JSON.stringify(
      {
        type: "chat",
        text: data.joke,
        name: "Server",
      }
    ));
  }

  /**Retrieves each member's name and sends back a message to the user only
   * message "In room: <memberName>, ..."
   */

  getMembers() {
    const members = [];
    this.room.members.forEach(m => members.push(m.name));

    this.send(JSON.stringify(
      {
        type: "chat",
        text: "In room: " + members.join(", "),
        name: "Server",
      }
    ));
  }

  /**Given message text and recipient, send private message to just that
   * recipient user
   */

  sendPrivMsg(msg, recipient) {
    let recipientUser;

    for (const member of this.room.members) {
      if(member.name === recipient) {
        recipientUser = member;
      }
    }

    recipientUser.send(JSON.stringify(
      {
        type: "chat",
        text: msg,
        name: `(private) ${this.name}`,
      }
    ))

    this.send(JSON.stringify(
      {
        type: "chat",
        text: msg,
        name: `(private) you`,
      }
    ))
  }

  /**Given a new name, update the user's username to the input; Broadcast this
   * change to the room the user is in
   */

  changeUsername(name) {
    const originalName = this.name;
    this.name = name;
    this.room.broadcast({
      type: "note",
      text: `${originalName} changed their name to ${this.name}!`,
    });
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);
    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") this.handleChat(msg.text);
    else if (msg.type === "get-joke") this.handleJoke();
    else if (msg.type === "get-members") this.getMembers();
    else if (msg.type === "send-priv-msg") {
      this.sendPrivMsg(msg.text, msg.recipient);
    }
    else if (msg.type === "change-username") this.changeUsername(msg.text);

    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
