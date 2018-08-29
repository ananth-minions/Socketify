window.uuidv4 = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

window.socketify = {
    _sockets: {},
    _sendMessage: function (message) {
        message._type = "socketify-out";
        window.postMessage(message, "*");
    },
    _onMessage: function (message) {
        var id = message._info.id;
        var socket = socketify._sockets[id];
        switch (message._info.command) {
            case "tcpServer-opened": {
            } break;
            // TODO: other tcpServer events
            case "tcpServer-closed": {
            } break;
            case "tcpClient-opened": {
                if (message._info.success) {
                    socket._onOpen(socket, undefined);
                }
                else {
                    socket._onOpen(undefined, message._info.error);
                    delete socketify._sockets[id];
                }
            } break;
            // TODO: other tcpClient events
            case "tcpClient-closed": {
                socket.onClose();
                delete socketify._sockets[id];
            } break;
            case "udpPeer-opened": {
                if (message._info.success) {
                    socket._onOpen(socket, undefined);
                }
                else {
                    socket._onOpen(undefined, message._info.error);
                    delete socketify._sockets[id];
                }
            } break;
            case "udpPeer-received": {
                socket.onMessage(message._info.sender, message);
            } break;
            case "udpPeer-closed": {
                socket.onClose();
                delete socketify._sockets[id];
            } break;
        }
    },
    tcpServer: function (endPoint, callback) {
        var id = uuidv4();
        socketify._sockets[id] = {
            _id: id,
            _onOpen: callback,
            onConnect: function (connection) { /* Unhandled - User should override n*/ },
            onClose: function () { /* Unhandled - User should override n*/ },
            close: function () {
                socketify._sendMessage({
                    _info: {
                        command: "tcpServer-close",
                        id: id
                    }
                });
            }
        };
        socketify._sendMessage({
            _info: {
                command: "tcpServer-open",
                id: id,
                endPoint: endPoint
            }
        });
    },
    tcpClient: function (endPoint, callback) {
        var id = uuidv4();
        socketify._sockets[id] = {
            _id: id,
            _onOpen: callback,
            connect: function (endPoint, callback) {
                socketify._sockets[id]._onConnect = callback;
                socketify._sendMessage({
                    _info: {
                        command: "tcpClient-connect",
                        id: id,
                        endPoint: endPoint
                    }
                });
            },
            onClose: function () { /* Unhandled - User should override n*/ },
            close: function () {
                socketify._sendMessage({
                    _info: {
                        command: "tcpClient-close",
                        id: id
                    }
                });
            }
        };
        socketify._sendMessage({
            _info: {
                command: "tcpClient-open",
                id: id,
                endPoint: endPoint
            }
        });
    },
    udpPeer: function (endPoint, callback) {
        var id = uuidv4();
        socketify._sockets[id] = {
            _id: id,
            _onOpen: callback,
            onMessage: function (sender, message) { /* Unhandled - User should override */ },
            onClose: function () { /* Unhandled - User should override n*/ },
            sendMessage: function (target, message) {
                message._info = {
                    command: "udpPeer-send",
                    id: id,
                    target: target
                };
                socketify._sendMessage(message);
            },
            close: function () {
                socketify._sendMessage({
                    _info: {
                        command: "udpPeer-close",
                        id: id
                    }
                });
            }
        };
        socketify._sendMessage({
            _info: {
                command: "udpPeer-open",
                id: id,
                endPoint: endPoint
            }
        });
    }
};

window.addEventListener("message", function (event) {
    if (event.source === window || event.data._type === "socketify-in") {
        window.socketify._onMessage(event.data);
    }
}, false);
