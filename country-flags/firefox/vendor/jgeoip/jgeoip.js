/* global */
/* eslint curly: 0, max-len: [1, 150], no-underscore-dangle: 0, no-param-reassign: 0,
  no-plusplus: 0, no-bitwise: 0, vars-on-top: 0, dot-notation: 0, quote-props: 0,
  no-mixed-operators: 0, key-spacing: 0, no-else-return: 0, consistent-return: 0,
  no-return-assign: 0, semi-style: 0, no-multi-spaces: 0, nonblock-statement-body-position: 0,
  no-buffer-constructor: 0 */

'use strict';

// -- Node modules
var fs = require('fs')
  ;

// -- Local modules

// -- Local constants

// -- Local variables

/**
 * LRU cache Library
 *
 * This library stores key/value pair in cache. It implements the LRU algoritmn
 * (Least Recently Used). It is freely inspired from
 * https://github.com/isaacs/node-lru-cache.
 *
 * @author   jclo
 * @since    0.0.1
 */
/* istanbul ignore next */
var _cache = function() {};

/* istanbul ignore next */
_cache = {

  init: function(_this) {
    _this._cache = {};      // contains keys, values,
    _this._list = {};       // contains time stamp and associated key,
    _this._lru = 0;         // the least recently used time stamp,
    _this._mru = 0;         // the most recently used time stamp,
    _this._items = 0;       // the number of key/value pairs stored in the cache,
    _this._maxItems = 1000; // the cache capacity in term of key/value pairs,
  },

  reset: function(_this) {
    _cache.init(_this);
  },

  // Add this key and its value to the cache.
  // If the key is already in the cache, retag it as the most recently
  // used. If the cache overflows, delete the least recently used.
  set: function(_this, key, value) {
    var oldStamp
      ;

    // Is this key already in cache?
    if (_this._cache[key] === undefined) {
      // No! Store it in cache and list, update _mru and _items.
      _this._cache[key] = {
        'key': key,
        'value': value,
        'stamp': _this._mru++
      };
      _this._list[_this._cache[key].stamp] = _this._cache[key];
      _this._items++;

      // Overflow?
      if (_this._items > _this._maxItems)
        _cache._overflow(_this);
    } else {
      // Yes! Make it as the most recently used.
      oldStamp = _this._cache[key].stamp;

      delete _this._list[_this._cache[key].stamp];
      _this._cache[key].stamp = _this._mru++;
      _this._list[_this._cache[key].stamp] = _this._cache[key];

      // If this key was the least recently used, find the new one.
      if (oldStamp === _this._lru)
        _cache._findLRU(_this);
    }
  },

  // Return the associated record or undefined.
  get: function(_this, key) {
    if (_this._cache[key])
      return _this._cache[key].value;
    else
      return undefined;
  },

  // As the cache overflows, delete the least recently used key
  // and find the new least recently used.
  _overflow: function(_this) {
    // Find the the least recently used key and delete it.
    var key = _this._list[_this._lru].key;
    delete _this._list[_this._cache[key].stamp];
    delete _this._cache[key];
    _this._items--;
    // Find the new LRU
    _cache._findLRU(_this);
  },

  // Find the new least recently used key.
  _findLRU: function(_this) {
    while (_this._lru < _this._mru && _this._list[_this._lru] === undefined) {
      _this._lru++;
    }
  },

  // For debugging purpose.
  _dumpCache: function(_this) {
    return _this._cache;
  },

  // For debugging purpose.
  _dumpList: function(_this) {
    return _this._list;
  },

  // For debugging purpose.
  _dumpParams: function(_this) {
    return {
      '_lru':      _this._lru,
      '_mru':      _this._mru,
      '_items':    _this._items,
      '_maxItems': _this._maxItems
    };
  }
};


/**
 * This library helps developpers to read the content of MaxMind Database. It
 * implements two methods. The first one retrieves information on the database
 * structure. The second one returns the stored record for a given IP address.

 * The structure of the database is detailed here:
 *   - http://maxmind.github.io/MaxMind-DB.
 *
 * In brief, it is organized in three sections:
 *
 *  . the Binary Search Section that contains the list of recognized IP addresses
 *    in an encoded format.
 *
 *  . the Output Data Section that contains records relative to these IP
 *    addresses.
 *
 *  . and finally the Metadata section that contains parameters on the database.
 *    These parameters allow to parse the database.
 *
 *         ___________________
 *        |                   |
 *        |   Binary Search   |
 *        |   Tree Section    |
 *        |___________________|
 *        |                   |
 *        |    Output Data    |
 *        |     Section       |
 *        |                   |
 *        |___________________|
 *        |                   |
 *        | Metadata Section  |
 *        |___________________|
 *
 *
 * When the constructor is called, it builds the following Javascript object by
 * extracting the metadata information:
 *
 *  this.metadata = {
 *    binary_format_major_version:    // release number,
 *    binary_format_minor_version:    // release number,
 *    build_epoch: 1396538608         //
 *    database_type:                  // name of the database,
 *    description:                    // a description of the database,
 *    ip_version:                     // IP addresses organization (IPV4 or IPV4 encapsulated into IPV6 format),
 *    languages:                      // languages supported in the record,
 *    node_count:                     // number of nodes,
 *    record_size:                    // node bit size,
 *    nodeByteSize:                   // node byte size,
 *    searchTreeSection:              // size of the search tree section,
 *    pointerBase:                    // beginning of the Output Data Section,
 *  }
 *
 * @author   jclo
 * @since    0.0.1
 */

// -- Private functions

/**
 * Finds where the Metadata section starts.
 *
 * @function (db)
 * @private
 * @param {Buffer}    The database contents,
 * @returns {Number}  Returns where the Metadata section starts or false,
 * @throws {Objet}    Throws an error message if the metadata pattern is not found,
 */
function _findWhereMetadataStart(db) {
  var METADATA_START_MARKER
    , metadataPointer
    , dbPointer
    , match
    ;

  // Metadata pattern to find: '\xab\xcd\xefMaxMind.com'
  METADATA_START_MARKER = Buffer.from('abcdef4d61784d696e642e636f6d', 'hex');
  metadataPointer = METADATA_START_MARKER.length - 1;
  dbPointer = db.length - 1;
  match = 0;

  // Start parsing 'db' from the end as the metadata section is the last section
  // of the 'database'. More details here: http://maxmind.github.io/MaxMind-DB.
  while (match <= metadataPointer && dbPointer--) {
    match = (db[dbPointer] === METADATA_START_MARKER[metadataPointer - match]) ? match + 1 : 0;
  }

  // Check if this pattern is found.
  if (match !== METADATA_START_MARKER.length)
    /* istanbul ignore next */
    throw new Error('The metadata pattern "0xab0xcd0xefMaxMind.com" was not found! Are you sure that you provided a MaxMind database file?');

  // Return the start position of the metadata section.
  return dbPointer + match;
}

/**
 * Finds the type and its payload.
 *
 * @function (db, offset)
 * @private
 * @param {Buffer}    The database contents,
 * @param {Number}    The pointer position,
 * @returns {Object}  Returns type, payload size and new pointer position,
 * @throws {Objet}    Throws an error if type unknown,
 */
function _findTypeAndPayloadSize(db, offset) {
  // The type is coded in the tree MSB bytes (000X XXXX).
  // The payload is coded in the five LSB bytes (XXX0 0000).
  var type
    , payload
    ;

  type = db[offset] >> 5;
  payload = db[offset++] & 0x1f;

  // Extended type?
  if (type === 0) {
    type = db[offset++] + 7;
    if (typeof type !== 'number' || type > 15)
      /* istanbul ignore next */
      throw new Error('The Type "' + type + '" is unknown!');
  }

  // For payload < 29
  // Be aware! For pointer (type 1) payload gives pointer size.
  if (payload < 29)
    return { type: type, 'size': payload, 'offset': offset };

  // If the value is 29, then the size is 29 + the next byte after
  // the type specifying bytes as an unsigned integer.
  if (payload === 29)
    return { type: type, 'size': 29 + db.readUInt8(offset++), 'offset': offset };

  // If the value is 30, then the size is 285 + the next two bytes
  // after the type specifying bytes as a single unsigned integer.
  if (payload === 30)
    return { type: type, 'size': 285 + ((db[offset++] << 8) | db[offset++]), 'offset': offset };

  // If the value is 31, then the size is 65,821 + the next three
  // bytes after the type specifying bytes as a single unsigned integer.
  if (payload === 31)
    return { type: type, 'size': 65821 + ((db[offset++] << 16) | (db[offset++] << 8) | db[offset++]), 'offset': offset };

  // This case should never occur because of 0x1f!
  /* istanbul ignore next */
  throw new Error('Payload size ' + payload + ' should never occur!');
}

/**
 * Returns the pointer value.
 *
 * @function (db, offset, pointerBase, payload)
 * @private
 * @param {Buffer}    The database contents,
 * @param {Number}    The pointer position,
 * @param {Number}    The data section position,
 * @returns {Object}  Returns pointer address and new pointer position,
 */
function _getPointer(db, offset, pointerBase, payload) {
  // Pointers use the last five bits in the control byte to calculate
  // the pointer value.
  // payload: 001S SVVV
  // 001 type pointer, SS pointer size, VVV pointer value
  var value = 0x7 & payload
    , size = 0x3 & (payload >> 3)
    , p
    ;

  // SS = 0 => p = vvv:byte(n+1)
  if (size === 0) {
    p = (value << 8) | db[offset++];
    return { 'pointer': pointerBase + p, 'offset': offset };
  }

  // SS = 1 => p = vvv:byte(n+1):byte(n+2) + 2048
  if (size === 1) {
    p = (value << 16) | (db[offset++] << 8) | db[offset++];
    return { 'pointer': pointerBase + p + 2048, 'offset': offset };
  }

  // SS = 2 => p = vvv:byte(n+1):byte(n+2):byte(n+3) + 526336
  if (size === 2) {
    p = (value << 24) | (db[offset++] << 16) | (db[offset++] << 8) | db[offset++];
    return { 'pointer': pointerBase + p + 526336, 'offset': offset };
  }

  // SS = 3 => p = byte(n+1):..:byte(n+4)
  if (size === 3) {
    p = (db[offset++] << 24) | (db[offset++] << 16) | (db[offset++] << 8) | db[offset++];
    return { 'pointer': pointerBase + p + 0, 'offset': offset };
  }
}

/**
 * Decode the type.
 *
 * @function (db, offset, pointerBase)
 * @private
 * @param {Buffer}    The database contents,
 * @param {Number}    The position of the type into the Buffer,
 * @param {Number}    The beginning of the data section,
 * @returns {Object}  Returns an object with the 'type', it's 'value' and the
 *                    position of the next 'element' in the database,
 * @throws {Object}   Throws an error if a not yet supported type has to be decoded,
 * @throws {Object}   Throws an error if the type is unknown,
 */
function _decode(db, offset, pointerBase) {
  var types
    , type
    , payloadSize
    , data
    , i
    ;

  // Associated type to data field.
  // More details here: http://maxmind.github.io/MaxMind-DB
  // (chapter: 'Output Data Section')
  types = [
    'extended',         //  0
    'pointer',          //  1
    'utf8_string',      //  2
    'double',           //  3
    'bytes',            //  4
    'uint16',           //  5
    'uint32',           //  6
    'map',              //  7
    'int32',            //  8
    'uint64',           //  9
    'uint128',          // 10
    'array',            // 11
    'container',        // 12
    'end_marker',       // 13
    'boolean',          // 14
    'float'             // 15
  ];

  // Retrieve type and payload.
  data = _findTypeAndPayloadSize(db, offset);
  type = types[data.type];
  offset = data.offset;
  payloadSize = data.size;


  // Decode the type.
  switch (type) {
    case 'pointer':
      var pData = _getPointer(db, offset, pointerBase, payloadSize);
      var pType = _decode(db, pData.pointer, pointerBase);
      return {
        'type': pType.type,
        'value': pType.value,
        'offset': pData.offset
      };

    case 'utf8_string':
      return {
        'type': type,
        'value': db.toString('utf8', offset, offset + payloadSize),
        'offset': offset += payloadSize
      };

    case 'double':
      return {
        'type': type,
        'value': db.readDoubleBE(offset),
        'offset': offset += payloadSize
      };

    case 'bytes':
      return {
        'type': type,
        'value': db.slice(offset, offset + payloadSize),
        'offset': offset += payloadSize
      };

    case 'uint16':
      if (payloadSize === 0) {
        data = 0;
      } else if (payloadSize === 1) {
        data = db[offset++];
      } else {
        data = (db[offset++] << 8) | db[offset++];
      }
      return {
        'type': type,
        'value': data,
        'offset': offset
      };

    case 'uint32':

      if (payloadSize === 0) {
        data = 0;
      } else if (payloadSize === 1) {
        data = db[offset++];
      } else if (payloadSize === 2) {
        data = (db[offset++] << 8) | db[offset++];
      } else if (payloadSize === 3) {
        data = (db[offset++] << 16) | (db[offset++]) << 8 | db[offset++];
      } else {
        data = (db[offset++] << 24) | (db[offset++]) << 16 | (db[offset++] << 8) | db[offset++];
      }
      return {
        'type': type,
        'value': data,
        'offset': offset
      };

    case 'map':
      // Compute number of keys/values pairs contained in the map.
      // Extract the map.
      var mapTypeKey = {};
      var mapTypeValue = {};
      var mapObj = {};
      var mapOffset = offset;

      for (i = 0; i < payloadSize; i++) {
        // Extract the key.
        mapTypeKey = _decode(db, mapOffset, pointerBase);
        mapOffset = mapTypeKey.offset;
        // Extract the key value.
        mapTypeValue = _decode(db, mapOffset, pointerBase);
        mapObj[mapTypeKey.value] = mapTypeValue.value;
        mapOffset = mapTypeValue.offset;
      }
      return {
        'type': type,
        'value': mapObj,
        'offset': mapOffset
      };

    case 'int32':
      data = 0;
      for (i = 0; i < payloadSize; i++)
        data = (data << 8) | db[offset++];
      return {
        'type': type,
        'value': data,
        'offset': offset
      };

    case 'uint64':
      data = 0;
      for (i = 0; i < payloadSize; i++)
        data = (data << 8) | db[offset++];

      return {
        'type': type,
        'value': data,
        'offset': offset
      };

    case 'uint128':
      throw new Error('This Type "' + type + '" is not decoded yet!');

    case 'array':
      // Extract the array
      var arrayType = {};
      var arrayObj = [];
      var arrayOffset = offset;

      for (i = 0; i < payloadSize; i++) {
        arrayType = _decode(db, arrayOffset, pointerBase);
        arrayObj.push(arrayType.value);
        arrayOffset = arrayType.offset;
      }
      return {
        'type': type,
        'value': arrayObj,
        'offset': arrayOffset
      };

    /* istanbul ignore next */
    case 'container':
      // Nothing in the database will ever contain a pointer to the this field
      // itself. This is in case of it changes in the future.
      throw new Error('This Type "' + type + '" is not decoded yet!');

    case 'end_marker':
      return {
        'type': type,
        'value': 0,
        'offset': offset
      };

    case 'boolean':
      return {
        'type': type,
        'value': payloadSize & 0x01,
        'offset': offset
      };

    case 'float':
      return {
        'type': type,
        'value': db.readFloatBE(offset),
        'offset': offset += 4
      };

    /* istanbul ignore next */
    default:
      throw new Error('This Type "' + type + '" is totally unknown!');
  }
}

/**
 * Returns the IP address converted to an array.
 *
 * @function (arg)
 * @param {String}    The IP address,
 * @returns {Array}   The pointer associated to this IP Address.
 * @throws {Object}   Throws an error if the IP address is malformed,
 */
function _expandIP(ip) {
  //  https://en.wikipedia.org/wiki/IPv6#Software, IPv4-mapped IPv6 addresses, "::ffff:192.168.13.13"
  var regexIPv4 = /^(::ffff:){0,1}(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    // Standard IPv6 only.
    // regexIPv6 = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/
    // Compacted IPv6 form too.
    , regexIPv6c = /^((([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}:[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){5}:([0-9A-Fa-f]{1,4}:)?[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){4}:([0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){3}:([0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){2}:([0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}((b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b).){3}(b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b))|(([0-9A-Fa-f]{1,4}:){0,5}:((b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b).){3}(b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b))|(::([0-9A-Fa-f]{1,4}:){0,5}((b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b).){3}(b((25[0-5])|(1d{2})|(2[0-4]d)|(d{1,2}))b))|([0-9A-Fa-f]{1,4}::([0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})|(::([0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){1,7}:))$/
    , bits
    ;

  // Test if it is a correct IPv4 or IPv6 address. Otherwise throw an error.
  if (regexIPv4.test(ip)) {
    if (ip.slice(0, 7) === '::ffff:') {
      //  6-mapped-4
      ip = ip.slice(7);
    }
    // Ok. It's an IPv4 address.
    // Convert the string to an array and convert the strings
    // elements to numbers.
    // Then, expand it to match IPv6 output form
    // From: '8.8.4.4'
    // To: [0, 0, 0, 0, 0, 0, 8 * 256 + 8, 4 * 256 + 4]
    // return ip.split('.').map(function(i) { return parseInt(i, 10); });
    ip = ip.split('.').map(function(i) {
      var partI = parseInt(i, 10);
      if (partI > 255) {
        throw new Error('This IP ' + ip + ' is not a valid IPv4 address!');
      } else {
        return partI;
      }
    });
    return [0, 0, 0, 0, 0, 0, ip[0] * 256 + ip[1], ip[2] * 256 + ip[3]];
  } else if (regexIPv6c.test(ip)) {
    // Ok. It's an IPv6 address.
    // Expand it if it's a compressed address and convert the
    // string elements to numbers.
    // Input form: '2001:4860:4860::8888'
    // return: [ 8193, 18528, 18528, 0, 0, 0, 0, 34952 ]
    bits = ip.split(':');

    if (bits.length < 8)
      // Expand it.
      ip = ip.replace('::', Array(11 - bits.length).join(':'));

    return ip.split(':').map(function(i) { return i === '' ? 0 : parseInt(i, 16); });
  } else
    // It's not an IPv4 nor an IPv6 address!
    throw new Error('This IP ' + ip + ' is not a valid IPv4 or IPv6 address!');
}

/**
 * Returns the node pointer for the given node and index.
 * section tree.
 *
 * @function (arg, arg, arg, arg4)
 * @private
 * @param {Number}    The current node number,
 * @param {Number}    The bit index,
 * @param {Object}    The database,
 * @param {Object}    The database metadata,
 * @returns {Number}  Returns he new pointer,
 * @throws {Object}   Throws an error if the record size is not supported,
 */

// Returns the 'pointer' for the given node and index.
function _returnNodePointer(nodeNumber, index, db, metadata) {
  var baseOffset = nodeNumber * metadata.nodeByteSize
    , bytes
    , middle
    ;

  switch (metadata.record_size) {
    // Node layout is 24 bits (6 bytes)
    // => each pointer is 3 bytes
    case 24:
      bytes = baseOffset + index * 3;
      // pointer = db(n) : db(n+1) : db(n+2)
      return ((db[bytes] << 16) | (db[bytes + 1] << 8) | db[bytes + 2]);

    // Node layout is 28 bits (7 bytes)
    // => each pointer is 14 bits (1 byte and half)
    // The middle byte is the MSB for each pointer
    case 28:
      // Extract middle byte
      middle = db.readUInt8(baseOffset + 3, true);
      middle = (index === 0) ? (0xF0 & middle) >> 4 : 0x0F & middle;
      bytes = baseOffset + index * 4;
      // pointer = middle : db(n) : db(n+1) : db(n+2)
      return ((middle << 24) | (db[bytes] << 16) | (db[bytes + 1] << 8) | db[bytes + 2]);

    // Node layout is 32 bits (8 bytes)
    // => each pointer is 4 bytes
    case 32:
      return bytes.readUInt32BE(baseOffset + index * 4, true);

    default:
      throw new Error('This record size: "' + metadata.record_size + '" is not supported!');
  }
}

/**
 * Searchs if the IP address has a corresponding pointer in the search
 * section tree.
 *
 * @function (ip, db, metadata)
 * @private
 * @param {String}    The IP address,
 * @param {Buffer}    The database,
 * @param {Object}    The database metadata,
 * @returns {Number}  The pointer associated to this IP Address.
 */
function _findAddressInTree(ip, db, metadata) {
  var nodeNumber = 0
    , record = 0
    , rawAddress = _expandIP(ip)
    ;

  // Parse the whole bits of this IP address.
  for (var i = 0; i < 128; i++) {
    var bit = 0
      , ipW
      ;

    // Start scanning bits from MSB to LSB.
    ipW = 0xFFFF & rawAddress[parseInt((i / 16), 10)];
    bit = 1 & (ipW >> 15 - (i % 16));

    // Find pointer for this node (depending on bit value).
    record = _returnNodePointer(nodeNumber, bit, db, metadata);

    if (record === metadata.node_count) {
      // If the record value is equal to the number of nodes, that means
      // that we do not have any data for the IP address, and the search
      // ends here.
      return 0;
    } else if (record > metadata.node_count) {
      // If the record value is greater than the number of nodes in the
      // search tree, then it is an actual pointer value pointing into
      // the data section.
      // The value of the pointer is calculated from the start of the
      // data section, not from the start of the file. To get the abs
      // value, the formula is:
      // $offsetinfile = ( $recordvalue - $nodecount ) + $searchtreesizeinbytes
      return record - metadata.node_count + metadata.searchTreeSection;
    } else {
      // If the record value is a number that is less than the number of nodes
      // (not in bytes, but the actual node count) in the search tree (this is
      // stored in the database metadata), then the value is a node number.
      // In this case, we find that node in the search tree and repeat the
      // lookup algorithm from there.
      nodeNumber = record;
    }
  }
}

// -- Public

/**
 * Reads the database, extracts the metadata and puts it in memory.
 *
 * @constructor (dbfile)
 * @param {String}  The database file,
 * @throws          Throws an error if the database doesn't not exist
 *                  or can't be read,
 * since 0.0.1,
 */
var GeoIP2 = function(dbfile) {
  var DATA_SECTION_SEPARATOR_SIZE = 16    // Bytes of NULLs in between the search tree and the data section.
    , metadataStart
    ;

  if (dbfile === undefined)
    throw new Error('You need to provide a database!');

  // Check that a file exist and can be read. Otherwise throw an
  // explicit message!
  try {
    fs.accessSync(dbfile, fs.R_OK);
  } catch (e) {
    throw new Error(e.message);
  }

  // Ok there is a file. We are going to store all the contents in memory.
  this.db = fs.readFileSync(dbfile);
  this.metadata = {};

  // Find where the Metadata section starts.
  metadataStart = _findWhereMetadataStart(this.db);
  // Extract the Metadata structure.
  this.metadata = _decode(this.db, metadataStart, this.metadata.pointerBase).value;
  // Add further details
  this.metadata['nodeByteSize'] = this.metadata.record_size / 4;
  this.metadata['searchTreeSection'] = this.metadata.record_size * 2 / 8 * this.metadata.node_count;
  // Compute where the Data section starts.
  this.metadata['pointerBase'] = this.metadata.searchTreeSection + DATA_SECTION_SEPARATOR_SIZE;

  // Initialize the cache that stores the latest IP records.
  _cache.init(this);
};

// -- Public Methods.
GeoIP2.prototype = {

  /**
   * Returns the database's metadata.
   *
   * @method ()
   * @public
   * @returns {Object}  Returns the metadata structure,
   * since 0.0.1,
   */
  getMetadata: function() {
    return this.metadata;
  },

  /**
   * Returns Maxmind's database record for this given IP address.
   *
   * @method (arg)
   * @public
   * @param {String}    The IPV4 or IPV6 address,
   * @returns {Objet}   The associated IP record or null,
   * since 0.0.1,
   */
  getRecord: function(ip) {
    var cache
      , pointer
      , value
      ;

    if (ip === undefined || ip === null)
      return null;

    /*
    pointer = _findAddressInTree(ip, this.db, this.metadata);
    return (pointer === 0) ? null : _decode(this.db, pointer, this.metadata.pointerBase).value;
    */

    // Retrieve the pointer associated to this IP.
    pointer = _findAddressInTree(ip, this.db, this.metadata);
    if (pointer === 0)
      return null;

    // IP already in cache?
    cache = _cache.get(this, pointer);
    if (cache)
      return cache;

    // Not! Extract the value from the db and save it to cache.
    value = _decode(this.db, pointer, this.metadata.pointerBase).value;
    _cache.set(this, pointer, value);
    return value;
  }
};

module.exports = GeoIP2;
