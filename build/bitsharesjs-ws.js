(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bitshares_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


if (global) {
    global.inst = "";
} else {
    var _inst = void 0;
};
var autoReconnect = true;
/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {boolean} auto means automatic reconnect if possible( browser case), default true
    */
    setAutoReconnect: function setAutoReconnect(auto) {
        autoReconnect = auto;
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";

        var _this = this;

        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        return this.close().then(function () {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(_this.statusCb);

            if (inst && connect) {
                inst.connect(cs, connectTimeout);
            }

            return inst;
        });
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;
        var enableCrypto = arguments[3];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, enableCrypto);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            return new Promise(function (res) {
                inst.close().then(function () {
                    inst = null;
                    res();
                });
            });
        }

        return Promise.resolve();
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
        var _this2 = this;

        var enableCrypto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        // console.log("INFO\tApiInstances\tconnect\t", cs);
        this.url = cs;
        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        if (this.ws_rpc) {
            this.ws_rpc.statusCb = null;
        }
        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout, autoReconnect, function () {
            if (_this2._db) {
                _this2._db.exec('get_objects', [['2.1.0']]).catch(function (e) {});
            }
        });

        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            console.log("Connected to API node:", cs);
            _this2._db = new _GrapheneApi2.default(_this2.ws_rpc, "database");
            _this2._net = new _GrapheneApi2.default(_this2.ws_rpc, "network_broadcast");
            _this2._hist = new _GrapheneApi2.default(_this2.ws_rpc, "history");
            if (enableCrypto) _this2._crypt = new _GrapheneApi2.default(_this2.ws_rpc, "crypto");
            var db_promise = _this2._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this2._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this2.chain_id = _chain_id;
                    return _ChainConfig2.default.setChainId(_chain_id);
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            _this2.ws_rpc.on_reconnect = function () {
                _this2.ws_rpc.login("", "").then(function () {
                    _this2._db.init().then(function () {
                        if (_this2.statusCb) _this2.statusCb("reconnect");
                    });
                    _this2._net.init();
                    _this2._hist.init();
                    if (enableCrypto) _this2._crypt.init();
                });
            };
            var initPromises = [db_promise, _this2._net.init(), _this2._hist.init()];
            if (enableCrypto) initPromises.push(_this2._crypt.init());
            return Promise.all(initPromises);
        });
    };

    ApisInstance.prototype.close = function close() {
        var _this3 = this;

        if (this.ws_rpc) {
            return this.ws_rpc.close().then(function () {
                _this3.ws_rpc = null;
            });
        };
        this.ws_rpc = null;
        return Promise.resolve();
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "VIN"
};

_this = {
    core_asset: "VIN",
    address_prefix: "VIN",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        VinChain: {
            core_asset: "VIN",
            address_prefix: "VIN",
            chain_id: "ffd5043058c6c890c2d3c6c007d46379899139eb064b5a5ab75a7ac60c74e9ce"
        },
        VinChainTest: {
            core_asset: "VIN",
            address_prefix: "VIN",
            chain_id: "3d883d444747a21e63596d79c67149189161c82c075494ed179261fec2ca708b"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "VIN";
        _this.address_prefix = "VIN";
        ecc_config.address_prefix = "VIN";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "GPH";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

exports.default = _this;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":7}],3:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
    WebSocketClient = require("ReconnectingWebSocket");
} else {
    WebSocketClient = WebSocket;
}

var SOCKET_DEBUG = false;

function getWebSocketClient(autoReconnect) {
    if (!autoReconnect && typeof WebSocket !== "undefined" && typeof document !== "undefined") {
        return WebSocket;
    }
    return WebSocketClient;
}

var keep_alive_interval = 5000;
var max_send_life = 5;
var max_recv_life = max_send_life * 2;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;

        var _this = this;

        var autoReconnect = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var keepAliveCb = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

        _classCallCheck(this, ChainWebSocket);

        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(function () {
            if (_this.current_reject) {
                var reject = _this.current_reject;
                _this.current_reject = null;
                if (_this.ws.terminate) {
                    _this.ws.terminate();
                } else {
                    _this.ws.close();
                }
                reject(new Error("Connection attempt timed out: " + ws_server));
            }
        }, connectTimeout);
        var WsClient = getWebSocketClient(autoReconnect);
        try {
            this.ws = new WsClient(ws_server);
        } catch (error) {
            console.error("invalid websocket URL:", error, ws_server);
            this.ws = new WsClient("wss://127.0.0.1:8090");
        }
        this.ws.timeoutInterval = 5000;
        this.current_reject = null;
        this.on_reconnect = null;
        this.send_life = max_send_life;
        this.recv_life = max_recv_life;
        this.keepAliveCb = keepAliveCb;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            _this.ws.onopen = function () {
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("open");
                if (_this.on_reconnect) _this.on_reconnect();
                _this.keepalive_timer = setInterval(function () {
                    _this.recv_life--;
                    if (_this.recv_life == 0) {
                        console.error('keep alive timeout.');
                        if (_this.ws.terminate) {
                            _this.ws.terminate();
                        } else {
                            _this.ws.close();
                        }
                        clearInterval(_this.keepalive_timer);
                        _this.keepalive_timer = undefined;
                        return;
                    }
                    _this.send_life--;
                    if (_this.send_life == 0) {
                        // this.ws.ping('', false, true);
                        if (_this.keepAliveCb) {
                            _this.keepAliveCb();
                        }
                        _this.send_life = max_send_life;
                    }
                }, 5000);
                _this.current_reject = null;
                resolve();
            };
            _this.ws.onerror = function (error) {
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("error");

                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                _this.recv_life = max_recv_life;
                _this.listener(JSON.parse(message.data));
            };
            _this.ws.onclose = function () {
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                var err = new Error('connection closed');
                for (var cbId = _this.responseCbId + 1; cbId <= _this.cbId; cbId += 1) {
                    _this.cbs[cbId].reject(err);
                }
                if (_this.statusCb) _this.statusCb("closed");
                if (_this.closeCb) _this.closeCb();
            };
        });
        this.cbId = 0;
        this.responseCbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    ChainWebSocket.prototype.call = function call(params) {
        var _this2 = this;

        if (this.ws.readyState !== 1) {
            return Promise.reject(new Error('websocket state error:' + this.ws.readyState));
        }
        var method = params[1];
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            var unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (var id in this.subs) {
                if (this.subs[id].callback === unSubCb) {
                    this.unsub[this.cbId] = id;
                    break;
                }
            }
        }

        var request = {
            method: "call",
            params: params
        };
        request.id = this.cbId;
        this.send_life = max_send_life;

        return new Promise(function (resolve, reject) {
            _this2.cbs[_this2.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            _this2.ws.send(JSON.stringify(request));
        });
    };

    ChainWebSocket.prototype.listener = function listener(response) {
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        var sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
            this.responseCbId = response.id;
        } else {
            callback = this.subs[response.id].callback;
        }

        if (callback && !sub) {
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.cbs[response.id];

            if (this.unsub[response.id]) {
                delete this.subs[this.unsub[response.id]];
                delete this.unsub[response.id];
            }
        } else if (callback && sub) {
            callback(response.params[1]);
        } else {
            console.log("Warning: unknown websocket response: ", response);
        }
    };

    ChainWebSocket.prototype.login = function login(user, password) {
        var _this3 = this;

        return this.connect_promise.then(function () {
            return _this3.call([1, "login", [user, password]]);
        });
    };

    ChainWebSocket.prototype.close = function close() {
        var _this4 = this;

        return new Promise(function (res) {
            _this4.closeCb = function () {
                res();
                _this4.closeCb = null;
            };
            _this4.ws.close();
            if (_this4.ws.readyState !== 1) res();
        });
    };

    return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"ReconnectingWebSocket":5,"_process":7,"ws":6}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    GrapheneApi.prototype.init = function init() {
        var self = this;
        return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
            //console.log("[GrapheneApi.js:11] ----- GrapheneApi.init ----->", this.api_name, response);
            self.api_id = response;
            return self;
        });
    };

    GrapheneApi.prototype.exec = function exec(method, params) {
        return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
            console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
            throw error;
        });
    };

    return GrapheneApi;
}();

exports.default = GrapheneApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HcmFwaGVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9SZWNvbm5lY3RpbmdXZWJTb2NrZXQvcmVjb25uZWN0aW5nLXdlYnNvY2tldC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFhBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9DaGFpbldlYlNvY2tldCA9IHJlcXVpcmUoXCIuL0NoYWluV2ViU29ja2V0XCIpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxudmFyIF9HcmFwaGVuZUFwaSA9IHJlcXVpcmUoXCIuL0dyYXBoZW5lQXBpXCIpO1xuXG52YXIgX0dyYXBoZW5lQXBpMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0dyYXBoZW5lQXBpKTtcblxudmFyIF9DaGFpbkNvbmZpZyA9IHJlcXVpcmUoXCIuL0NoYWluQ29uZmlnXCIpO1xuXG52YXIgX0NoYWluQ29uZmlnMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluQ29uZmlnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH0gLy8gdmFyIHsgTGlzdCB9ID0gcmVxdWlyZShcImltbXV0YWJsZVwiKTtcblxuXG5pZiAoZ2xvYmFsKSB7XG4gICAgZ2xvYmFsLmluc3QgPSBcIlwiO1xufSBlbHNlIHtcbiAgICB2YXIgX2luc3QgPSB2b2lkIDA7XG59O1xudmFyIGF1dG9SZWNvbm5lY3QgPSB0cnVlO1xuLyoqXG4gICAgQ29uZmlndXJlOiBjb25maWd1cmUgYXMgZm9sbG93cyBgQXBpcy5pbnN0YW5jZShcIndzOi8vbG9jYWxob3N0OjgwOTBcIikuaW5pdF9wcm9taXNlYC4gIFRoaXMgcmV0dXJucyBhIHByb21pc2UsIG9uY2UgcmVzb2x2ZWQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkuXG5cbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcblxuICAgIFNob3J0LWhhbmQ6IEFwaXMuZGIoXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi4pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuXG4gICAgQWRkaXRpb25hbCB1c2FnZTogQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMoXCJtZXRob2RcIiwgW1wibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uXSkuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG4qL1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG5cbiAgICBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2s6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXR1c0NiID0gY2FsbGJhY2s7XG4gICAgICAgIGlmIChpbnN0KSBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAgICBAYXJnIHtib29sZWFufSBhdXRvIG1lYW5zIGF1dG9tYXRpYyByZWNvbm5lY3QgaWYgcG9zc2libGUoIGJyb3dzZXIgY2FzZSksIGRlZmF1bHQgdHJ1ZVxuICAgICovXG4gICAgc2V0QXV0b1JlY29ubmVjdDogZnVuY3Rpb24gc2V0QXV0b1JlY29ubmVjdChhdXRvKSB7XG4gICAgICAgIGF1dG9SZWNvbm5lY3QgPSBhdXRvO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgICAgQGFyZyB7c3RyaW5nfSBjcyBpcyBvbmx5IHByb3ZpZGVkIGluIHRoZSBmaXJzdCBjYWxsXG4gICAgICAgIEByZXR1cm4ge0FwaXN9IHNpbmdsZXRvbiAuLiBDaGVjayBBcGlzLmluc3RhbmNlKCkuaW5pdF9wcm9taXNlIHRvIGtub3cgd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBlc3RhYmxpc2hlZFxuICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICB2YXIgY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwid3M6Ly9sb2NhbGhvc3Q6ODA5MFwiO1xuXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKF90aGlzLnN0YXR1c0NiKTtcblxuICAgICAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaW5zdDtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbnN0YW5jZTogZnVuY3Rpb24gaW5zdGFuY2UoKSB7XG4gICAgICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJ3czovL2xvY2FsaG9zdDo4MDkwXCI7XG4gICAgICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDQwMDA7XG4gICAgICAgIHZhciBlbmFibGVDcnlwdG8gPSBhcmd1bWVudHNbM107XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0LCBlbmFibGVDcnlwdG8pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGluc3QuY2xvc2UoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHJlcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIC8vIGRiOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gbmV0d29yazogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLm5ldHdvcmtfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gaGlzdG9yeTogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmhpc3RvcnlfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gY3J5cHRvOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuY3J5cHRvX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpXG59O1xuXG52YXIgQXBpc0luc3RhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFwaXNJbnN0YW5jZSgpIHtcbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEFwaXNJbnN0YW5jZSk7XG4gICAgfVxuXG4gICAgLyoqIEBhcmcge3N0cmluZ30gY29ubmVjdGlvbiAuLiAqL1xuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIHZhciBlbmFibGVDcnlwdG8gPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiSU5GT1xcdEFwaUluc3RhbmNlc1xcdGNvbm5lY3RcXHRcIiwgY3MpO1xuICAgICAgICB0aGlzLnVybCA9IGNzO1xuICAgICAgICB2YXIgcnBjX3VzZXIgPSBcIlwiLFxuICAgICAgICAgICAgcnBjX3Bhc3N3b3JkID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiBjcy5pbmRleE9mKFwid3NzOi8vXCIpIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VjdXJlIGRvbWFpbnMgcmVxdWlyZSB3c3MgY29ubmVjdGlvblwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLndzX3JwYykge1xuICAgICAgICAgICAgdGhpcy53c19ycGMuc3RhdHVzQ2IgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3NfcnBjID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdChjcywgdGhpcy5zdGF0dXNDYiwgY29ubmVjdFRpbWVvdXQsIGF1dG9SZWNvbm5lY3QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpczIuX2RiKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMyLl9kYi5leGVjKCdnZXRfb2JqZWN0cycsIFtbJzIuMS4wJ11dKS5jYXRjaChmdW5jdGlvbiAoZSkge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmluaXRfcHJvbWlzZSA9IHRoaXMud3NfcnBjLmxvZ2luKHJwY191c2VyLCBycGNfcGFzc3dvcmQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0ZWQgdG8gQVBJIG5vZGU6XCIsIGNzKTtcbiAgICAgICAgICAgIF90aGlzMi5fZGIgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiZGF0YWJhc2VcIik7XG4gICAgICAgICAgICBfdGhpczIuX25ldCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMyLndzX3JwYywgXCJuZXR3b3JrX2Jyb2FkY2FzdFwiKTtcbiAgICAgICAgICAgIF90aGlzMi5faGlzdCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMyLndzX3JwYywgXCJoaXN0b3J5XCIpO1xuICAgICAgICAgICAgaWYgKGVuYWJsZUNyeXB0bykgX3RoaXMyLl9jcnlwdCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMyLndzX3JwYywgXCJjcnlwdG9cIik7XG4gICAgICAgICAgICB2YXIgZGJfcHJvbWlzZSA9IF90aGlzMi5fZGIuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0b25vbWV4L2dyYXBoZW5lL3dpa2kvY2hhaW4tbG9ja2VkLXR4XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMi5fZGIuZXhlYyhcImdldF9jaGFpbl9pZFwiLCBbXSkudGhlbihmdW5jdGlvbiAoX2NoYWluX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzMi5jaGFpbl9pZCA9IF9jaGFpbl9pZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9DaGFpbkNvbmZpZzIuZGVmYXVsdC5zZXRDaGFpbklkKF9jaGFpbl9pZCk7XG4gICAgICAgICAgICAgICAgICAgIC8vREVCVUcgY29uc29sZS5sb2coXCJjaGFpbl9pZDFcIix0aGlzLmNoYWluX2lkKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBfdGhpczIud3NfcnBjLm9uX3JlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfdGhpczIud3NfcnBjLmxvZ2luKFwiXCIsIFwiXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdGhpczIuc3RhdHVzQ2IpIF90aGlzMi5zdGF0dXNDYihcInJlY29ubmVjdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzMi5fbmV0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMyLl9oaXN0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZUNyeXB0bykgX3RoaXMyLl9jcnlwdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGluaXRQcm9taXNlcyA9IFtkYl9wcm9taXNlLCBfdGhpczIuX25ldC5pbml0KCksIF90aGlzMi5faGlzdC5pbml0KCldO1xuICAgICAgICAgICAgaWYgKGVuYWJsZUNyeXB0bykgaW5pdFByb21pc2VzLnB1c2goX3RoaXMyLl9jcnlwdC5pbml0KCkpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGluaXRQcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLndzX3JwYykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNsb3NlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMzLndzX3JwYyA9IG51bGw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy53c19ycGMgPSBudWxsO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuZGJfYXBpID0gZnVuY3Rpb24gZGJfYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGI7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUubmV0d29ya19hcGkgPSBmdW5jdGlvbiBuZXR3b3JrX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25ldDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5oaXN0b3J5X2FwaSA9IGZ1bmN0aW9uIGhpc3RvcnlfYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jcnlwdG9fYXBpID0gZnVuY3Rpb24gY3J5cHRvX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NyeXB0O1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayA9IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXR1c0NiID0gY2FsbGJhY2s7XG4gICAgfTtcblxuICAgIHJldHVybiBBcGlzSW5zdGFuY2U7XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgX3RoaXMgPSB2b2lkIDA7XG5cbnZhciBlY2NfY29uZmlnID0ge1xuICAgIGFkZHJlc3NfcHJlZml4OiBwcm9jZXNzLmVudi5ucG1fY29uZmlnX19ncmFwaGVuZV9lY2NfZGVmYXVsdF9hZGRyZXNzX3ByZWZpeCB8fCBcIlZJTlwiXG59O1xuXG5fdGhpcyA9IHtcbiAgICBjb3JlX2Fzc2V0OiBcIlZJTlwiLFxuICAgIGFkZHJlc3NfcHJlZml4OiBcIlZJTlwiLFxuICAgIGV4cGlyZV9pbl9zZWNzOiAxNSxcbiAgICBleHBpcmVfaW5fc2Vjc19wcm9wb3NhbDogMjQgKiA2MCAqIDYwLFxuICAgIHJldmlld19pbl9zZWNzX2NvbW1pdHRlZTogMjQgKiA2MCAqIDYwLFxuICAgIG5ldHdvcmtzOiB7XG4gICAgICAgIFZpbkNoYWluOiB7XG4gICAgICAgICAgICBjb3JlX2Fzc2V0OiBcIlZJTlwiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiVklOXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCJmZmQ1MDQzMDU4YzZjODkwYzJkM2M2YzAwN2Q0NjM3OTg5OTEzOWViMDY0YjVhNWFiNzVhN2FjNjBjNzRlOWNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgVmluQ2hhaW5UZXN0OiB7XG4gICAgICAgICAgICBjb3JlX2Fzc2V0OiBcIlZJTlwiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiVklOXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCIzZDg4M2Q0NDQ3NDdhMjFlNjM1OTZkNzljNjcxNDkxODkxNjFjODJjMDc1NDk0ZWQxNzkyNjFmZWMyY2E3MDhiXCJcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiogU2V0IGEgZmV3IHByb3BlcnRpZXMgZm9yIGtub3duIGNoYWluIElEcy4gKi9cbiAgICBzZXRDaGFpbklkOiBmdW5jdGlvbiBzZXRDaGFpbklkKGNoYWluX2lkKSB7XG5cbiAgICAgICAgdmFyIGkgPSB2b2lkIDAsXG4gICAgICAgICAgICBsZW4gPSB2b2lkIDAsXG4gICAgICAgICAgICBuZXR3b3JrID0gdm9pZCAwLFxuICAgICAgICAgICAgbmV0d29ya19uYW1lID0gdm9pZCAwLFxuICAgICAgICAgICAgcmVmID0gdm9pZCAwO1xuICAgICAgICByZWYgPSBPYmplY3Qua2V5cyhfdGhpcy5uZXR3b3Jrcyk7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cbiAgICAgICAgICAgIG5ldHdvcmtfbmFtZSA9IHJlZltpXTtcbiAgICAgICAgICAgIG5ldHdvcmsgPSBfdGhpcy5uZXR3b3Jrc1tuZXR3b3JrX25hbWVdO1xuXG4gICAgICAgICAgICBpZiAobmV0d29yay5jaGFpbl9pZCA9PT0gY2hhaW5faWQpIHtcblxuICAgICAgICAgICAgICAgIF90aGlzLm5ldHdvcmtfbmFtZSA9IG5ldHdvcmtfbmFtZTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXR3b3JrLmFkZHJlc3NfcHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gbmV0d29yay5hZGRyZXNzX3ByZWZpeDtcbiAgICAgICAgICAgICAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IG5ldHdvcmsuYWRkcmVzc19wcmVmaXg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJJTkZPICAgIENvbmZpZ3VyZWQgZm9yXCIsIG5ldHdvcmtfbmFtZSwgXCI6XCIsIG5ldHdvcmsuY29yZV9hc3NldCwgXCJcXG5cIik7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yazogbmV0d29ya1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV90aGlzLm5ldHdvcmtfbmFtZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGNoYWluIGlkICh0aGlzIG1heSBiZSBhIHRlc3RuZXQpXCIsIGNoYWluX2lkKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIF90aGlzLmNvcmVfYXNzZXQgPSBcIlZJTlwiO1xuICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IFwiVklOXCI7XG4gICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBcIlZJTlwiO1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2VjcyA9IDE1O1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2Vjc19wcm9wb3NhbCA9IDI0ICogNjAgKiA2MDtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNoYWluIGNvbmZpZyByZXNldFwiKTtcbiAgICB9LFxuXG4gICAgc2V0UHJlZml4OiBmdW5jdGlvbiBzZXRQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwiR1BIXCI7XG5cbiAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gICAgfVxufTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gX3RoaXM7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgV2ViU29ja2V0Q2xpZW50ID0gdm9pZCAwO1xuaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09IFwidW5kZWZpbmVkXCIgJiYgIXByb2Nlc3MuZW52LmJyb3dzZXIpIHtcbiAgICBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKFwid3NcIik7XG59IGVsc2UgaWYgKHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZShcIlJlY29ubmVjdGluZ1dlYlNvY2tldFwiKTtcbn0gZWxzZSB7XG4gICAgV2ViU29ja2V0Q2xpZW50ID0gV2ViU29ja2V0O1xufVxuXG52YXIgU09DS0VUX0RFQlVHID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGdldFdlYlNvY2tldENsaWVudChhdXRvUmVjb25uZWN0KSB7XG4gICAgaWYgKCFhdXRvUmVjb25uZWN0ICYmIHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJldHVybiBXZWJTb2NrZXQ7XG4gICAgfVxuICAgIHJldHVybiBXZWJTb2NrZXRDbGllbnQ7XG59XG5cbnZhciBrZWVwX2FsaXZlX2ludGVydmFsID0gNTAwMDtcbnZhciBtYXhfc2VuZF9saWZlID0gNTtcbnZhciBtYXhfcmVjdl9saWZlID0gbWF4X3NlbmRfbGlmZSAqIDI7XG5cbnZhciBDaGFpbldlYlNvY2tldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDaGFpbldlYlNvY2tldCh3c19zZXJ2ZXIsIHN0YXR1c0NiKSB7XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNTAwMDtcblxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBhdXRvUmVjb25uZWN0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiB0cnVlO1xuICAgICAgICB2YXIga2VlcEFsaXZlQ2IgPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IG51bGw7XG5cbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluV2ViU29ja2V0KTtcblxuICAgICAgICB0aGlzLnN0YXR1c0NiID0gc3RhdHVzQ2I7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5jdXJyZW50X3JlamVjdCkge1xuICAgICAgICAgICAgICAgIHZhciByZWplY3QgPSBfdGhpcy5jdXJyZW50X3JlamVjdDtcbiAgICAgICAgICAgICAgICBfdGhpcy5jdXJyZW50X3JlamVjdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLndzLnRlcm1pbmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy53cy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy53cy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiQ29ubmVjdGlvbiBhdHRlbXB0IHRpbWVkIG91dDogXCIgKyB3c19zZXJ2ZXIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgY29ubmVjdFRpbWVvdXQpO1xuICAgICAgICB2YXIgV3NDbGllbnQgPSBnZXRXZWJTb2NrZXRDbGllbnQoYXV0b1JlY29ubmVjdCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLndzID0gbmV3IFdzQ2xpZW50KHdzX3NlcnZlcik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiaW52YWxpZCB3ZWJzb2NrZXQgVVJMOlwiLCBlcnJvciwgd3Nfc2VydmVyKTtcbiAgICAgICAgICAgIHRoaXMud3MgPSBuZXcgV3NDbGllbnQoXCJ3c3M6Ly8xMjcuMC4wLjE6ODA5MFwiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndzLnRpbWVvdXRJbnRlcnZhbCA9IDUwMDA7XG4gICAgICAgIHRoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgICAgICB0aGlzLm9uX3JlY29ubmVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VuZF9saWZlID0gbWF4X3NlbmRfbGlmZTtcbiAgICAgICAgdGhpcy5yZWN2X2xpZmUgPSBtYXhfcmVjdl9saWZlO1xuICAgICAgICB0aGlzLmtlZXBBbGl2ZUNiID0ga2VlcEFsaXZlQ2I7XG4gICAgICAgIHRoaXMuY29ubmVjdF9wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QgPSByZWplY3Q7XG4gICAgICAgICAgICBfdGhpcy53cy5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwib3BlblwiKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMub25fcmVjb25uZWN0KSBfdGhpcy5vbl9yZWNvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnJlY3ZfbGlmZS0tO1xuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMucmVjdl9saWZlID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2tlZXAgYWxpdmUgdGltZW91dC4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy53cy50ZXJtaW5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy53cy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMud3MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoX3RoaXMua2VlcGFsaXZlX3RpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmtlZXBhbGl2ZV90aW1lciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZW5kX2xpZmUtLTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNlbmRfbGlmZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLndzLnBpbmcoJycsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5rZWVwQWxpdmVDYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmtlZXBBbGl2ZUNiKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZW5kX2xpZmUgPSBtYXhfc2VuZF9saWZlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwMCk7XG4gICAgICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpcy53cy5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmtlZXBhbGl2ZV90aW1lcikge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKF90aGlzLmtlZXBhbGl2ZV90aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmtlZXBhbGl2ZV90aW1lciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwiZXJyb3JcIik7XG5cbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY3VycmVudF9yZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpcy53cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIF90aGlzLnJlY3ZfbGlmZSA9IG1heF9yZWN2X2xpZmU7XG4gICAgICAgICAgICAgICAgX3RoaXMubGlzdGVuZXIoSlNPTi5wYXJzZShtZXNzYWdlLmRhdGEpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpcy53cy5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5rZWVwYWxpdmVfdGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfdGhpcy5rZWVwYWxpdmVfdGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ2Nvbm5lY3Rpb24gY2xvc2VkJyk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgY2JJZCA9IF90aGlzLnJlc3BvbnNlQ2JJZCArIDE7IGNiSWQgPD0gX3RoaXMuY2JJZDsgY2JJZCArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmNic1tjYklkXS5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImNsb3NlZFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY2xvc2VDYikgX3RoaXMuY2xvc2VDYigpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuY2JJZCA9IDA7XG4gICAgICAgIHRoaXMucmVzcG9uc2VDYklkID0gMDtcbiAgICAgICAgdGhpcy5jYnMgPSB7fTtcbiAgICAgICAgdGhpcy5zdWJzID0ge307XG4gICAgICAgIHRoaXMudW5zdWIgPSB7fTtcbiAgICB9XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIGNhbGwocGFyYW1zKSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLndzLnJlYWR5U3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ3dlYnNvY2tldCBzdGF0ZSBlcnJvcjonICsgdGhpcy53cy5yZWFkeVN0YXRlKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGhvZCA9IHBhcmFtc1sxXTtcbiAgICAgICAgaWYgKFNPQ0tFVF9ERUJVRykgY29uc29sZS5sb2coXCJbQ2hhaW5XZWJTb2NrZXRdID4tLS0tIGNhbGwgLS0tLS0+ICBcXFwiaWRcXFwiOlwiICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgICAgICB0aGlzLmNiSWQgKz0gMTtcblxuICAgICAgICBpZiAobWV0aG9kID09PSBcInNldF9zdWJzY3JpYmVfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic3Vic2NyaWJlX3RvX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFja1wiKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSBjYWxsYmFjayBpbiBzdWJzIG1hcFxuICAgICAgICAgICAgdGhpcy5zdWJzW3RoaXMuY2JJZF0gPSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHBhcmFtc1syXVswXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBjYWxsYmFjayB3aXRoIHRoZSBjYWxsYmFjayBpZFxuICAgICAgICAgICAgcGFyYW1zWzJdWzBdID0gdGhpcy5jYklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdWzBdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgb2YgdW5zdWIgbXVzdCBiZSB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB1blN1YkNiID0gcGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuc3Vicykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1YnNbaWRdLmNhbGxiYWNrID09PSB1blN1YkNiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJbdGhpcy5jYklkXSA9IGlkO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG1ldGhvZDogXCJjYWxsXCIsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuICAgICAgICB0aGlzLnNlbmRfbGlmZSA9IG1heF9zZW5kX2xpZmU7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIF90aGlzMi5jYnNbX3RoaXMyLmNiSWRdID0ge1xuICAgICAgICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICByZWplY3Q6IHJlamVjdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIF90aGlzMi53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5saXN0ZW5lciA9IGZ1bmN0aW9uIGxpc3RlbmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChTT0NLRVRfREVCVUcpIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA8LS0tLSByZXBseSAtLS0tPFwiLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuXG4gICAgICAgIHZhciBzdWIgPSBmYWxzZSxcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBpZiAocmVzcG9uc2UubWV0aG9kID09PSBcIm5vdGljZVwiKSB7XG4gICAgICAgICAgICBzdWIgPSB0cnVlO1xuICAgICAgICAgICAgcmVzcG9uc2UuaWQgPSByZXNwb25zZS5wYXJhbXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN1Yikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG4gICAgICAgICAgICB0aGlzLnJlc3BvbnNlQ2JJZCA9IHJlc3BvbnNlLmlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLnN1YnNbcmVzcG9uc2UuaWRdLmNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICYmICFzdWIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlamVjdChyZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlc29sdmUocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN1YnNbdGhpcy51bnN1YltyZXNwb25zZS5pZF1dO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjYWxsYmFjayAmJiBzdWIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLnBhcmFtc1sxXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIldhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIsIHBhc3N3b3JkKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczMuY2FsbChbMSwgXCJsb2dpblwiLCBbdXNlciwgcGFzc3dvcmRdXSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIF90aGlzNC5jbG9zZUNiID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlcygpO1xuICAgICAgICAgICAgICAgIF90aGlzNC5jbG9zZUNiID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpczQud3MuY2xvc2UoKTtcbiAgICAgICAgICAgIGlmIChfdGhpczQud3MucmVhZHlTdGF0ZSAhPT0gMSkgcmVzKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ2hhaW5XZWJTb2NrZXQ7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IENoYWluV2ViU29ja2V0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIEdyYXBoZW5lQXBpID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEdyYXBoZW5lQXBpKHdzX3JwYywgYXBpX25hbWUpIHtcbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEdyYXBoZW5lQXBpKTtcblxuICAgICAgICB0aGlzLndzX3JwYyA9IHdzX3JwYztcbiAgICAgICAgdGhpcy5hcGlfbmFtZSA9IGFwaV9uYW1lO1xuICAgIH1cblxuICAgIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy53c19ycGMuY2FsbChbMSwgdGhpcy5hcGlfbmFtZSwgW11dKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIltHcmFwaGVuZUFwaS5qczoxMV0gLS0tLS0gR3JhcGhlbmVBcGkuaW5pdCAtLS0tLT5cIiwgdGhpcy5hcGlfbmFtZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgc2VsZi5hcGlfaWQgPSByZXNwb25zZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgR3JhcGhlbmVBcGkucHJvdG90eXBlLmV4ZWMgPSBmdW5jdGlvbiBleGVjKG1ldGhvZCwgcGFyYW1zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFt0aGlzLmFwaV9pZCwgbWV0aG9kLCBwYXJhbXNdKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIEdyYXBoZW5lQXBpIGVycm9yOiBcIiwgbWV0aG9kLCBwYXJhbXMsIGVycm9yLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gR3JhcGhlbmVBcGk7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IEdyYXBoZW5lQXBpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCIvLyBNSVQgTGljZW5zZTpcbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMiwgSm9lIFdhbG5lc1xuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbi8vIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi8vIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi8vIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4vLyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4vLyBUSEUgU09GVFdBUkUuXG5cbi8qKlxuICogVGhpcyBiZWhhdmVzIGxpa2UgYSBXZWJTb2NrZXQgaW4gZXZlcnkgd2F5LCBleGNlcHQgaWYgaXQgZmFpbHMgdG8gY29ubmVjdCxcbiAqIG9yIGl0IGdldHMgZGlzY29ubmVjdGVkLCBpdCB3aWxsIHJlcGVhdGVkbHkgcG9sbCB1bnRpbCBpdCBzdWNjZXNzZnVsbHkgY29ubmVjdHNcbiAqIGFnYWluLlxuICpcbiAqIEl0IGlzIEFQSSBjb21wYXRpYmxlLCBzbyB3aGVuIHlvdSBoYXZlOlxuICogICB3cyA9IG5ldyBXZWJTb2NrZXQoJ3dzOi8vLi4uLicpO1xuICogeW91IGNhbiByZXBsYWNlIHdpdGg6XG4gKiAgIHdzID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCgnd3M6Ly8uLi4uJyk7XG4gKlxuICogVGhlIGV2ZW50IHN0cmVhbSB3aWxsIHR5cGljYWxseSBsb29rIGxpa2U6XG4gKiAgb25jb25uZWN0aW5nXG4gKiAgb25vcGVuXG4gKiAgb25tZXNzYWdlXG4gKiAgb25tZXNzYWdlXG4gKiAgb25jbG9zZSAvLyBsb3N0IGNvbm5lY3Rpb25cbiAqICBvbmNvbm5lY3RpbmdcbiAqICBvbm9wZW4gIC8vIHNvbWV0aW1lIGxhdGVyLi4uXG4gKiAgb25tZXNzYWdlXG4gKiAgb25tZXNzYWdlXG4gKiAgZXRjLi4uXG4gKlxuICogSXQgaXMgQVBJIGNvbXBhdGlibGUgd2l0aCB0aGUgc3RhbmRhcmQgV2ViU29ja2V0IEFQSSwgYXBhcnQgZnJvbSB0aGUgZm9sbG93aW5nIG1lbWJlcnM6XG4gKlxuICogLSBgYnVmZmVyZWRBbW91bnRgXG4gKiAtIGBleHRlbnNpb25zYFxuICogLSBgYmluYXJ5VHlwZWBcbiAqXG4gKiBMYXRlc3QgdmVyc2lvbjogaHR0cHM6Ly9naXRodWIuY29tL2pvZXdhbG5lcy9yZWNvbm5lY3Rpbmctd2Vic29ja2V0L1xuICogLSBKb2UgV2FsbmVzXG4gKlxuICogU3ludGF4XG4gKiA9PT09PT1cbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgcHJvdG9jb2xzLCBvcHRpb25zKTtcbiAqXG4gKiBQYXJhbWV0ZXJzXG4gKiA9PT09PT09PT09XG4gKiB1cmwgLSBUaGUgdXJsIHlvdSBhcmUgY29ubmVjdGluZyB0by5cbiAqIHByb3RvY29scyAtIE9wdGlvbmFsIHN0cmluZyBvciBhcnJheSBvZiBwcm90b2NvbHMuXG4gKiBvcHRpb25zIC0gU2VlIGJlbG93XG4gKlxuICogT3B0aW9uc1xuICogPT09PT09PVxuICogT3B0aW9ucyBjYW4gZWl0aGVyIGJlIHBhc3NlZCB1cG9uIGluc3RhbnRpYXRpb24gb3Igc2V0IGFmdGVyIGluc3RhbnRpYXRpb246XG4gKlxuICogdmFyIHNvY2tldCA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsLCBudWxsLCB7IGRlYnVnOiB0cnVlLCByZWNvbm5lY3RJbnRlcnZhbDogNDAwMCB9KTtcbiAqXG4gKiBvclxuICpcbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCk7XG4gKiBzb2NrZXQuZGVidWcgPSB0cnVlO1xuICogc29ja2V0LnJlY29ubmVjdEludGVydmFsID0gNDAwMDtcbiAqXG4gKiBkZWJ1Z1xuICogLSBXaGV0aGVyIHRoaXMgaW5zdGFuY2Ugc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy4gQWNjZXB0cyB0cnVlIG9yIGZhbHNlLiBEZWZhdWx0OiBmYWxzZS5cbiAqXG4gKiBhdXRvbWF0aWNPcGVuXG4gKiAtIFdoZXRoZXIgb3Igbm90IHRoZSB3ZWJzb2NrZXQgc2hvdWxkIGF0dGVtcHQgdG8gY29ubmVjdCBpbW1lZGlhdGVseSB1cG9uIGluc3RhbnRpYXRpb24uIFRoZSBzb2NrZXQgY2FuIGJlIG1hbnVhbGx5IG9wZW5lZCBvciBjbG9zZWQgYXQgYW55IHRpbWUgdXNpbmcgd3Mub3BlbigpIGFuZCB3cy5jbG9zZSgpLlxuICpcbiAqIHJlY29ubmVjdEludGVydmFsXG4gKiAtIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGJlZm9yZSBhdHRlbXB0aW5nIHRvIHJlY29ubmVjdC4gQWNjZXB0cyBpbnRlZ2VyLiBEZWZhdWx0OiAxMDAwLlxuICpcbiAqIG1heFJlY29ubmVjdEludGVydmFsXG4gKiAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYSByZWNvbm5lY3Rpb24gYXR0ZW1wdC4gQWNjZXB0cyBpbnRlZ2VyLiBEZWZhdWx0OiAzMDAwMC5cbiAqXG4gKiByZWNvbm5lY3REZWNheVxuICogLSBUaGUgcmF0ZSBvZiBpbmNyZWFzZSBvZiB0aGUgcmVjb25uZWN0IGRlbGF5LiBBbGxvd3MgcmVjb25uZWN0IGF0dGVtcHRzIHRvIGJhY2sgb2ZmIHdoZW4gcHJvYmxlbXMgcGVyc2lzdC4gQWNjZXB0cyBpbnRlZ2VyIG9yIGZsb2F0LiBEZWZhdWx0OiAxLjUuXG4gKlxuICogdGltZW91dEludGVydmFsXG4gKiAtIFRoZSBtYXhpbXVtIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIHdhaXQgZm9yIGEgY29ubmVjdGlvbiB0byBzdWNjZWVkIGJlZm9yZSBjbG9zaW5nIGFuZCByZXRyeWluZy4gQWNjZXB0cyBpbnRlZ2VyLiBEZWZhdWx0OiAyMDAwLlxuICpcbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyl7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGdsb2JhbC5SZWNvbm5lY3RpbmdXZWJTb2NrZXQgPSBmYWN0b3J5KCk7XG4gICAgfVxufSkodGhpcywgZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgfHwgISgnV2ViU29ja2V0JyBpbiB3aW5kb3cpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsLCBwcm90b2NvbHMsIG9wdGlvbnMpIHtcblxuICAgICAgICAvLyBEZWZhdWx0IHNldHRpbmdzXG4gICAgICAgIHZhciBzZXR0aW5ncyA9IHtcblxuICAgICAgICAgICAgLyoqIFdoZXRoZXIgdGhpcyBpbnN0YW5jZSBzaG91bGQgbG9nIGRlYnVnIG1lc3NhZ2VzLiAqL1xuICAgICAgICAgICAgZGVidWc6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKiogV2hldGhlciBvciBub3QgdGhlIHdlYnNvY2tldCBzaG91bGQgYXR0ZW1wdCB0byBjb25uZWN0IGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi4gKi9cbiAgICAgICAgICAgIGF1dG9tYXRpY09wZW46IHRydWUsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBiZWZvcmUgYXR0ZW1wdGluZyB0byByZWNvbm5lY3QuICovXG4gICAgICAgICAgICByZWNvbm5lY3RJbnRlcnZhbDogMTAwMCxcbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGEgcmVjb25uZWN0aW9uIGF0dGVtcHQuICovXG4gICAgICAgICAgICBtYXhSZWNvbm5lY3RJbnRlcnZhbDogMzAwMDAsXG4gICAgICAgICAgICAvKiogVGhlIHJhdGUgb2YgaW5jcmVhc2Ugb2YgdGhlIHJlY29ubmVjdCBkZWxheS4gQWxsb3dzIHJlY29ubmVjdCBhdHRlbXB0cyB0byBiYWNrIG9mZiB3aGVuIHByb2JsZW1zIHBlcnNpc3QuICovXG4gICAgICAgICAgICByZWNvbm5lY3REZWNheTogMS41LFxuXG4gICAgICAgICAgICAvKiogVGhlIG1heGltdW0gdGltZSBpbiBtaWxsaXNlY29uZHMgdG8gd2FpdCBmb3IgYSBjb25uZWN0aW9uIHRvIHN1Y2NlZWQgYmVmb3JlIGNsb3NpbmcgYW5kIHJldHJ5aW5nLiAqL1xuICAgICAgICAgICAgdGltZW91dEludGVydmFsOiAyMDAwLFxuXG4gICAgICAgICAgICAvKiogVGhlIG1heGltdW0gbnVtYmVyIG9mIHJlY29ubmVjdGlvbiBhdHRlbXB0cyB0byBtYWtlLiBVbmxpbWl0ZWQgaWYgbnVsbC4gKi9cbiAgICAgICAgICAgIG1heFJlY29ubmVjdEF0dGVtcHRzOiBudWxsLFxuXG4gICAgICAgICAgICAvKiogVGhlIGJpbmFyeSB0eXBlLCBwb3NzaWJsZSB2YWx1ZXMgJ2Jsb2InIG9yICdhcnJheWJ1ZmZlcicsIGRlZmF1bHQgJ2Jsb2InLiAqL1xuICAgICAgICAgICAgYmluYXJ5VHlwZTogJ2Jsb2InXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zKSB7IG9wdGlvbnMgPSB7fTsgfVxuXG4gICAgICAgIC8vIE92ZXJ3cml0ZSBhbmQgZGVmaW5lIHNldHRpbmdzIHdpdGggb3B0aW9ucyBpZiB0aGV5IGV4aXN0LlxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9uc1trZXldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gc2V0dGluZ3Nba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZXNlIHNob3VsZCBiZSB0cmVhdGVkIGFzIHJlYWQtb25seSBwcm9wZXJ0aWVzXG5cbiAgICAgICAgLyoqIFRoZSBVUkwgYXMgcmVzb2x2ZWQgYnkgdGhlIGNvbnN0cnVjdG9yLiBUaGlzIGlzIGFsd2F5cyBhbiBhYnNvbHV0ZSBVUkwuIFJlYWQgb25seS4gKi9cbiAgICAgICAgdGhpcy51cmwgPSB1cmw7XG5cbiAgICAgICAgLyoqIFRoZSBudW1iZXIgb2YgYXR0ZW1wdGVkIHJlY29ubmVjdHMgc2luY2Ugc3RhcnRpbmcsIG9yIHRoZSBsYXN0IHN1Y2Nlc3NmdWwgY29ubmVjdGlvbi4gUmVhZCBvbmx5LiAqL1xuICAgICAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGNvbm5lY3Rpb24uXG4gICAgICAgICAqIENhbiBiZSBvbmUgb2Y6IFdlYlNvY2tldC5DT05ORUNUSU5HLCBXZWJTb2NrZXQuT1BFTiwgV2ViU29ja2V0LkNMT1NJTkcsIFdlYlNvY2tldC5DTE9TRURcbiAgICAgICAgICogUmVhZCBvbmx5LlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gV2ViU29ja2V0LkNPTk5FQ1RJTkc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgc3RyaW5nIGluZGljYXRpbmcgdGhlIG5hbWUgb2YgdGhlIHN1Yi1wcm90b2NvbCB0aGUgc2VydmVyIHNlbGVjdGVkOyB0aGlzIHdpbGwgYmUgb25lIG9mXG4gICAgICAgICAqIHRoZSBzdHJpbmdzIHNwZWNpZmllZCBpbiB0aGUgcHJvdG9jb2xzIHBhcmFtZXRlciB3aGVuIGNyZWF0aW5nIHRoZSBXZWJTb2NrZXQgb2JqZWN0LlxuICAgICAgICAgKiBSZWFkIG9ubHkuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnByb3RvY29sID0gbnVsbDtcblxuICAgICAgICAvLyBQcml2YXRlIHN0YXRlIHZhcmlhYmxlc1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHdzO1xuICAgICAgICB2YXIgZm9yY2VkQ2xvc2UgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRpbWVkT3V0ID0gZmFsc2U7XG4gICAgICAgIHZhciB0ID0gbnVsbDtcbiAgICAgICAgdmFyIGV2ZW50VGFyZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgLy8gV2lyZSB1cCBcIm9uKlwiIHByb3BlcnRpZXMgYXMgZXZlbnQgaGFuZGxlcnNcblxuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbm9wZW4oZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25jbG9zZShldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdjb25uZWN0aW5nJywgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmNvbm5lY3RpbmcoZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25tZXNzYWdlKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgICAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9uZXJyb3IoZXZlbnQpOyB9KTtcblxuICAgICAgICAvLyBFeHBvc2UgdGhlIEFQSSByZXF1aXJlZCBieSBFdmVudFRhcmdldFxuXG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciA9IGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChldmVudFRhcmdldCk7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGV2ZW50VGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChldmVudFRhcmdldCk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCA9IGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQuYmluZChldmVudFRhcmdldCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoaXMgZnVuY3Rpb24gZ2VuZXJhdGVzIGFuIGV2ZW50IHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIHN0YW5kYXJkXG4gICAgICAgICAqIGNvbXBsaWFudCBicm93c2VycyBhbmQgSUU5IC0gSUUxMVxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIHdpbGwgcHJldmVudCB0aGUgZXJyb3I6XG4gICAgICAgICAqIE9iamVjdCBkb2Vzbid0IHN1cHBvcnQgdGhpcyBhY3Rpb25cbiAgICAgICAgICpcbiAgICAgICAgICogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xOTM0NTM5Mi93aHktYXJlbnQtbXktcGFyYW1ldGVycy1nZXR0aW5nLXBhc3NlZC10aHJvdWdoLXRvLWEtZGlzcGF0Y2hlZC1ldmVudC8xOTM0NTU2MyMxOTM0NTU2M1xuICAgICAgICAgKiBAcGFyYW0gcyBTdHJpbmcgVGhlIG5hbWUgdGhhdCB0aGUgZXZlbnQgc2hvdWxkIHVzZVxuICAgICAgICAgKiBAcGFyYW0gYXJncyBPYmplY3QgYW4gb3B0aW9uYWwgb2JqZWN0IHRoYXQgdGhlIGV2ZW50IHdpbGwgdXNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZW5lcmF0ZUV2ZW50KHMsIGFyZ3MpIHtcbiAgICAgICAgXHR2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgICAgICAgXHRldnQuaW5pdEN1c3RvbUV2ZW50KHMsIGZhbHNlLCBmYWxzZSwgYXJncyk7XG4gICAgICAgIFx0cmV0dXJuIGV2dDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9wZW4gPSBmdW5jdGlvbiAocmVjb25uZWN0QXR0ZW1wdCkge1xuICAgICAgICAgICAgd3MgPSBuZXcgV2ViU29ja2V0KHNlbGYudXJsLCBwcm90b2NvbHMgfHwgW10pO1xuICAgICAgICAgICAgd3MuYmluYXJ5VHlwZSA9IHRoaXMuYmluYXJ5VHlwZTtcblxuICAgICAgICAgICAgaWYgKHJlY29ubmVjdEF0dGVtcHQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tYXhSZWNvbm5lY3RBdHRlbXB0cyAmJiB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID4gdGhpcy5tYXhSZWNvbm5lY3RBdHRlbXB0cykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Nvbm5lY3RpbmcnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdhdHRlbXB0LWNvbm5lY3QnLCBzZWxmLnVybCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsb2NhbFdzID0gd3M7XG4gICAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdjb25uZWN0aW9uLXRpbWVvdXQnLCBzZWxmLnVybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsb2NhbFdzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgdGltZWRPdXQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHNlbGYudGltZW91dEludGVydmFsKTtcblxuICAgICAgICAgICAgd3Mub25vcGVuID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbm9wZW4nLCBzZWxmLnVybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYucHJvdG9jb2wgPSB3cy5wcm90b2NvbDtcbiAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuT1BFTjtcbiAgICAgICAgICAgICAgICBzZWxmLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGdlbmVyYXRlRXZlbnQoJ29wZW4nKTtcbiAgICAgICAgICAgICAgICBlLmlzUmVjb25uZWN0ID0gcmVjb25uZWN0QXR0ZW1wdDtcbiAgICAgICAgICAgICAgICByZWNvbm5lY3RBdHRlbXB0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHdzLm9uY2xvc2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB3cyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGZvcmNlZENsb3NlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DTE9TRUQ7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY2xvc2UnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0LkNPTk5FQ1RJTkc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnY29ubmVjdGluZycpO1xuICAgICAgICAgICAgICAgICAgICBlLmNvZGUgPSBldmVudC5jb2RlO1xuICAgICAgICAgICAgICAgICAgICBlLnJlYXNvbiA9IGV2ZW50LnJlYXNvbjtcbiAgICAgICAgICAgICAgICAgICAgZS53YXNDbGVhbiA9IGV2ZW50Lndhc0NsZWFuO1xuICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29ubmVjdEF0dGVtcHQgJiYgIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25jbG9zZScsIHNlbGYudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY2xvc2UnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZW91dCA9IHNlbGYucmVjb25uZWN0SW50ZXJ2YWwgKiBNYXRoLnBvdyhzZWxmLnJlY29ubmVjdERlY2F5LCBzZWxmLnJlY29ubmVjdEF0dGVtcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgdCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnJlY29ubmVjdEF0dGVtcHRzKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLm9wZW4odHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQgPiBzZWxmLm1heFJlY29ubmVjdEludGVydmFsID8gc2VsZi5tYXhSZWNvbm5lY3RJbnRlcnZhbCA6IHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25tZXNzYWdlJywgc2VsZi51cmwsIGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZSA9IGdlbmVyYXRlRXZlbnQoJ21lc3NhZ2UnKTtcbiAgICAgICAgICAgICAgICBlLmRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3Mub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbmVycm9yJywgc2VsZi51cmwsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdlcnJvcicpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXaGV0aGVyIG9yIG5vdCB0byBjcmVhdGUgYSB3ZWJzb2NrZXQgdXBvbiBpbnN0YW50aWF0aW9uXG4gICAgICAgIGlmICh0aGlzLmF1dG9tYXRpY09wZW4gPT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5vcGVuKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmFuc21pdHMgZGF0YSB0byB0aGUgc2VydmVyIG92ZXIgdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZGF0YSBhIHRleHQgc3RyaW5nLCBBcnJheUJ1ZmZlciBvciBCbG9iIHRvIHNlbmQgdG8gdGhlIHNlcnZlci5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICh3cykge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnc2VuZCcsIHNlbGYudXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdzLnNlbmQoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93ICdJTlZBTElEX1NUQVRFX0VSUiA6IFBhdXNpbmcgdG8gcmVjb25uZWN0IHdlYnNvY2tldCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsb3NlcyB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24gb3IgY29ubmVjdGlvbiBhdHRlbXB0LCBpZiBhbnkuXG4gICAgICAgICAqIElmIHRoZSBjb25uZWN0aW9uIGlzIGFscmVhZHkgQ0xPU0VELCB0aGlzIG1ldGhvZCBkb2VzIG5vdGhpbmcuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oY29kZSwgcmVhc29uKSB7XG4gICAgICAgICAgICAvLyBEZWZhdWx0IENMT1NFX05PUk1BTCBjb2RlXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvZGUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb2RlID0gMTAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcmNlZENsb3NlID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh3cykge1xuICAgICAgICAgICAgICAgIHdzLmNsb3NlKGNvZGUsIHJlYXNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0KTtcbiAgICAgICAgICAgICAgICB0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkaXRpb25hbCBwdWJsaWMgQVBJIG1ldGhvZCB0byByZWZyZXNoIHRoZSBjb25uZWN0aW9uIGlmIHN0aWxsIG9wZW4gKGNsb3NlLCByZS1vcGVuKS5cbiAgICAgICAgICogRm9yIGV4YW1wbGUsIGlmIHRoZSBhcHAgc3VzcGVjdHMgYmFkIGRhdGEgLyBtaXNzZWQgaGVhcnQgYmVhdHMsIGl0IGNhbiB0cnkgdG8gcmVmcmVzaC5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHdzKSB7XG4gICAgICAgICAgICAgICAgd3MuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gT1BFTjtcbiAgICAgKiB0aGlzIGluZGljYXRlcyB0aGF0IHRoZSBjb25uZWN0aW9uIGlzIHJlYWR5IHRvIHNlbmQgYW5kIHJlY2VpdmUgZGF0YS5cbiAgICAgKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9ub3BlbiA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uJ3MgcmVhZHlTdGF0ZSBjaGFuZ2VzIHRvIENMT1NFRC4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9uY2xvc2UgPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGEgY29ubmVjdGlvbiBiZWdpbnMgYmVpbmcgYXR0ZW1wdGVkLiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25jb25uZWN0aW5nID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiBhIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiBhbiBlcnJvciBvY2N1cnMuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBhbGwgaW5zdGFuY2VzIG9mIFJlY29ubmVjdGluZ1dlYlNvY2tldCBzaG91bGQgbG9nIGRlYnVnIG1lc3NhZ2VzLlxuICAgICAqIFNldHRpbmcgdGhpcyB0byB0cnVlIGlzIHRoZSBlcXVpdmFsZW50IG9mIHNldHRpbmcgYWxsIGluc3RhbmNlcyBvZiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWcgdG8gdHJ1ZS5cbiAgICAgKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwgPSBmYWxzZTtcblxuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5DT05ORUNUSU5HID0gV2ViU29ja2V0LkNPTk5FQ1RJTkc7XG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0Lk9QRU4gPSBXZWJTb2NrZXQuT1BFTjtcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ0xPU0lORyA9IFdlYlNvY2tldC5DTE9TSU5HO1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5DTE9TRUQgPSBXZWJTb2NrZXQuQ0xPU0VEO1xuXG4gICAgcmV0dXJuIFJlY29ubmVjdGluZ1dlYlNvY2tldDtcbn0pO1xuIiwiIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
