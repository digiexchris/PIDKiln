"use strict";
(() => {
  // src/state.ts
  var ws = null;
  function setWs(socket) {
    ws = socket;
  }
  var state = {};
  function setState(newState) {
    state = newState;
  }
  var preferences = {};
  function setPreferences(prefs) {
    preferences = prefs;
  }
  var editorState = { filename: "", isNew: false };
  function setEditorState(newState) {
    editorState = newState;
  }
  var chart = null;
  function setChart(c) {
    chart = c;
  }
  var chartInitializing = false;
  function setChartInitializing(v) {
    chartInitializing = v;
  }
  var chartData = {
    timestamps: [],
    kilnTemps: [],
    setTemps: [],
    envTemps: [],
    caseTemps: [],
    markers: []
  };
  var CHART_MAX_POINTS = 8640;
  var CHART_MIN_WINDOW = 30 * 60;
  var autoScrollEnabled = true;
  function setAutoScrollEnabled(v) {
    autoScrollEnabled = v;
  }
  var programProfile = null;
  function setProgramProfile(p) {
    programProfile = p;
  }
  var programProfileLocked = false;
  function setProgramProfileLocked(v) {
    programProfileLocked = v;
  }
  var isProgramRunning = false;
  function setIsProgramRunning(v) {
    isProgramRunning = v;
  }
  var previewCharts = /* @__PURE__ */ new Map();
  var previewCache = /* @__PURE__ */ new Map();
  var manualDisconnect = false;
  function setManualDisconnect(v) {
    manualDisconnect = v;
  }
  var reconnectTimeout = null;
  function setReconnectTimeout(v) {
    reconnectTimeout = v;
  }
  var reconnectStartTime = null;
  function setReconnectStartTime(v) {
    reconnectStartTime = v;
  }
  var RECONNECT_TIMEOUT_MS = 3e4;
  var RECONNECT_INTERVAL_MS = 3e3;
  var wsLogEnabled = false;
  function setWsLogEnabled(v) {
    wsLogEnabled = v;
  }
  var isSimulator = false;
  function setIsSimulator(v) {
    isSimulator = v;
  }
  var timeScale = 1;
  function setTimeScale(v) {
    timeScale = v;
  }
  var simulatedNow = null;
  function setSimulatedNow(v) {
    simulatedNow = v;
  }
  function resetChartData() {
    chartData.timestamps = [];
    chartData.kilnTemps = [];
    chartData.setTemps = [];
    chartData.envTemps = [];
    chartData.caseTemps = [];
    chartData.markers = [];
  }

  // src/utils.ts
  function formatTemp(val) {
    return val !== void 0 ? `${val.toFixed(1)}\xB0C` : "--";
  }
  function formatTimeLabel(value) {
    const date = new Date(value * 1e3);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function formatPreviewTimeLabel(baseMs, offsetMinutes) {
    const ms = baseMs + Math.round(offsetMinutes * 60 * 1e3);
    const date = new Date(ms);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function getErrorMessage(err) {
    if (err instanceof Error)
      return err.message;
    return String(err);
  }
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }
  function escapeAttr(value) {
    return escapeHtml(value);
  }
  function escapeJs(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }
  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (match) => `\\${match}`);
  }
  function timeToSeconds(field) {
    if (!field)
      return 0;
    const hours = Number(field.hours) || 0;
    const minutes = Number(field.minutes) || 0;
    const seconds = Number(field.seconds) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  // node_modules/flatbuffers/mjs/constants.js
  var SIZEOF_SHORT = 2;
  var SIZEOF_INT = 4;
  var FILE_IDENTIFIER_LENGTH = 4;
  var SIZE_PREFIX_LENGTH = 4;

  // node_modules/flatbuffers/mjs/utils.js
  var int32 = new Int32Array(2);
  var float32 = new Float32Array(int32.buffer);
  var float64 = new Float64Array(int32.buffer);
  var isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

  // node_modules/flatbuffers/mjs/encoding.js
  var Encoding;
  (function(Encoding2) {
    Encoding2[Encoding2["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding2[Encoding2["UTF16_STRING"] = 2] = "UTF16_STRING";
  })(Encoding || (Encoding = {}));

  // node_modules/flatbuffers/mjs/byte-buffer.js
  var ByteBuffer = class _ByteBuffer {
    /**
     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
     */
    constructor(bytes_) {
      this.bytes_ = bytes_;
      this.position_ = 0;
      this.text_decoder_ = new TextDecoder();
    }
    /**
     * Create and allocate a new ByteBuffer with a given size.
     */
    static allocate(byte_size) {
      return new _ByteBuffer(new Uint8Array(byte_size));
    }
    clear() {
      this.position_ = 0;
    }
    /**
     * Get the underlying `Uint8Array`.
     */
    bytes() {
      return this.bytes_;
    }
    /**
     * Get the buffer's position.
     */
    position() {
      return this.position_;
    }
    /**
     * Set the buffer's position.
     */
    setPosition(position) {
      this.position_ = position;
    }
    /**
     * Get the buffer's capacity.
     */
    capacity() {
      return this.bytes_.length;
    }
    readInt8(offset) {
      return this.readUint8(offset) << 24 >> 24;
    }
    readUint8(offset) {
      return this.bytes_[offset];
    }
    readInt16(offset) {
      return this.readUint16(offset) << 16 >> 16;
    }
    readUint16(offset) {
      return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
    }
    readInt32(offset) {
      return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
    }
    readUint32(offset) {
      return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
      return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
      return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
      int32[0] = this.readInt32(offset);
      return float32[0];
    }
    readFloat64(offset) {
      int32[isLittleEndian ? 0 : 1] = this.readInt32(offset);
      int32[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
      return float64[0];
    }
    writeInt8(offset, value) {
      this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
      this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
    }
    writeUint16(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
    }
    writeInt32(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
      this.bytes_[offset + 2] = value >> 16;
      this.bytes_[offset + 3] = value >> 24;
    }
    writeUint32(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
      this.bytes_[offset + 2] = value >> 16;
      this.bytes_[offset + 3] = value >> 24;
    }
    writeInt64(offset, value) {
      this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
      this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
      this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
      this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
      float32[0] = value;
      this.writeInt32(offset, int32[0]);
    }
    writeFloat64(offset, value) {
      float64[0] = value;
      this.writeInt32(offset, int32[isLittleEndian ? 0 : 1]);
      this.writeInt32(offset + 4, int32[isLittleEndian ? 1 : 0]);
    }
    /**
     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
     * schema does not include a file_identifier (likely points at padding or the
     * start of a the root vtable).
     */
    getBufferIdentifier() {
      if (this.bytes_.length < this.position_ + SIZEOF_INT + FILE_IDENTIFIER_LENGTH) {
        throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");
      }
      let result = "";
      for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
        result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
      }
      return result;
    }
    /**
     * Look up a field in the vtable, return an offset into the object, or 0 if the
     * field is not present.
     */
    __offset(bb_pos, vtable_offset) {
      const vtable = bb_pos - this.readInt32(bb_pos);
      return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
    }
    /**
     * Initialize any Table-derived type to point to the union at the given offset.
     */
    __union(t, offset) {
      t.bb_pos = offset + this.readInt32(offset);
      t.bb = this;
      return t;
    }
    /**
     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
     * This allocates a new string and converts to wide chars upon each access.
     *
     * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
     * "optionalEncoding" argument. This is useful for avoiding conversion when
     * the data will just be packaged back up in another FlatBuffer later on.
     *
     * @param offset
     * @param opt_encoding Defaults to UTF16_STRING
     */
    __string(offset, opt_encoding) {
      offset += this.readInt32(offset);
      const length = this.readInt32(offset);
      offset += SIZEOF_INT;
      const utf8bytes = this.bytes_.subarray(offset, offset + length);
      if (opt_encoding === Encoding.UTF8_BYTES)
        return utf8bytes;
      else
        return this.text_decoder_.decode(utf8bytes);
    }
    /**
     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
     * if a string then return a new one
     *
     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
     * makes the behaviour of __union_with_string different compared to __union
     */
    __union_with_string(o, offset) {
      if (typeof o === "string") {
        return this.__string(offset);
      }
      return this.__union(o, offset);
    }
    /**
     * Retrieve the relative offset stored at "offset"
     */
    __indirect(offset) {
      return offset + this.readInt32(offset);
    }
    /**
     * Get the start of data of a vector whose offset is stored at "offset" in this object.
     */
    __vector(offset) {
      return offset + this.readInt32(offset) + SIZEOF_INT;
    }
    /**
     * Get the length of a vector whose offset is stored at "offset" in this object.
     */
    __vector_len(offset) {
      return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(ident) {
      if (ident.length != FILE_IDENTIFIER_LENGTH) {
        throw new Error("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
      }
      for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
        if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
          return false;
        }
      }
      return true;
    }
    /**
     * A helper function for generating list for obj api
     */
    createScalarList(listAccessor, listLength) {
      const ret = [];
      for (let i = 0; i < listLength; ++i) {
        const val = listAccessor(i);
        if (val !== null) {
          ret.push(val);
        }
      }
      return ret;
    }
    /**
     * A helper function for generating list for obj api
     * @param listAccessor function that accepts an index and return data at that index
     * @param listLength listLength
     * @param res result list
     */
    createObjList(listAccessor, listLength) {
      const ret = [];
      for (let i = 0; i < listLength; ++i) {
        const val = listAccessor(i);
        if (val !== null) {
          ret.push(val.unpack());
        }
      }
      return ret;
    }
  };

  // node_modules/flatbuffers/mjs/builder.js
  var Builder = class _Builder {
    /**
     * Create a FlatBufferBuilder.
     */
    constructor(opt_initial_size) {
      this.minalign = 1;
      this.vtable = null;
      this.vtable_in_use = 0;
      this.isNested = false;
      this.object_start = 0;
      this.vtables = [];
      this.vector_num_elems = 0;
      this.force_defaults = false;
      this.string_maps = null;
      this.text_encoder = new TextEncoder();
      let initial_size;
      if (!opt_initial_size) {
        initial_size = 1024;
      } else {
        initial_size = opt_initial_size;
      }
      this.bb = ByteBuffer.allocate(initial_size);
      this.space = initial_size;
    }
    clear() {
      this.bb.clear();
      this.space = this.bb.capacity();
      this.minalign = 1;
      this.vtable = null;
      this.vtable_in_use = 0;
      this.isNested = false;
      this.object_start = 0;
      this.vtables = [];
      this.vector_num_elems = 0;
      this.force_defaults = false;
      this.string_maps = null;
    }
    /**
     * In order to save space, fields that are set to their default value
     * don't get serialized into the buffer. Forcing defaults provides a
     * way to manually disable this optimization.
     *
     * @param forceDefaults true always serializes default values
     */
    forceDefaults(forceDefaults) {
      this.force_defaults = forceDefaults;
    }
    /**
     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
     * called finish(). The actual data starts at the ByteBuffer's current position,
     * not necessarily at 0.
     */
    dataBuffer() {
      return this.bb;
    }
    /**
     * Get the bytes representing the FlatBuffer. Only call this after you've
     * called finish().
     */
    asUint8Array() {
      return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    /**
     * Prepare to write an element of `size` after `additional_bytes` have been
     * written, e.g. if you write a string, you need to align such the int length
     * field is aligned to 4 bytes, and the string data follows it directly. If all
     * you need to do is alignment, `additional_bytes` will be 0.
     *
     * @param size This is the of the new element to write
     * @param additional_bytes The padding size
     */
    prep(size, additional_bytes) {
      if (size > this.minalign) {
        this.minalign = size;
      }
      const align_size = ~(this.bb.capacity() - this.space + additional_bytes) + 1 & size - 1;
      while (this.space < align_size + size + additional_bytes) {
        const old_buf_size = this.bb.capacity();
        this.bb = _Builder.growByteBuffer(this.bb);
        this.space += this.bb.capacity() - old_buf_size;
      }
      this.pad(align_size);
    }
    pad(byte_size) {
      for (let i = 0; i < byte_size; i++) {
        this.bb.writeInt8(--this.space, 0);
      }
    }
    writeInt8(value) {
      this.bb.writeInt8(this.space -= 1, value);
    }
    writeInt16(value) {
      this.bb.writeInt16(this.space -= 2, value);
    }
    writeInt32(value) {
      this.bb.writeInt32(this.space -= 4, value);
    }
    writeInt64(value) {
      this.bb.writeInt64(this.space -= 8, value);
    }
    writeFloat32(value) {
      this.bb.writeFloat32(this.space -= 4, value);
    }
    writeFloat64(value) {
      this.bb.writeFloat64(this.space -= 8, value);
    }
    /**
     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int8` to add the buffer.
     */
    addInt8(value) {
      this.prep(1, 0);
      this.writeInt8(value);
    }
    /**
     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int16` to add the buffer.
     */
    addInt16(value) {
      this.prep(2, 0);
      this.writeInt16(value);
    }
    /**
     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int32` to add the buffer.
     */
    addInt32(value) {
      this.prep(4, 0);
      this.writeInt32(value);
    }
    /**
     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int64` to add the buffer.
     */
    addInt64(value) {
      this.prep(8, 0);
      this.writeInt64(value);
    }
    /**
     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float32` to add the buffer.
     */
    addFloat32(value) {
      this.prep(4, 0);
      this.writeFloat32(value);
    }
    /**
     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float64` to add the buffer.
     */
    addFloat64(value) {
      this.prep(8, 0);
      this.writeFloat64(value);
    }
    addFieldInt8(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt8(value);
        this.slot(voffset);
      }
    }
    addFieldInt16(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt16(value);
        this.slot(voffset);
      }
    }
    addFieldInt32(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt32(value);
        this.slot(voffset);
      }
    }
    addFieldInt64(voffset, value, defaultValue) {
      if (this.force_defaults || value !== defaultValue) {
        this.addInt64(value);
        this.slot(voffset);
      }
    }
    addFieldFloat32(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addFloat32(value);
        this.slot(voffset);
      }
    }
    addFieldFloat64(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addFloat64(value);
        this.slot(voffset);
      }
    }
    addFieldOffset(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addOffset(value);
        this.slot(voffset);
      }
    }
    /**
     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
     */
    addFieldStruct(voffset, value, defaultValue) {
      if (value != defaultValue) {
        this.nested(value);
        this.slot(voffset);
      }
    }
    /**
     * Structures are always stored inline, they need to be created right
     * where they're used.  You'll get this assertion failure if you
     * created it elsewhere.
     */
    nested(obj) {
      if (obj != this.offset()) {
        throw new TypeError("FlatBuffers: struct must be serialized inline.");
      }
    }
    /**
     * Should not be creating any other object, string or vector
     * while an object is being constructed
     */
    notNested() {
      if (this.isNested) {
        throw new TypeError("FlatBuffers: object serialization must not be nested.");
      }
    }
    /**
     * Set the current vtable at `voffset` to the current location in the buffer.
     */
    slot(voffset) {
      if (this.vtable !== null)
        this.vtable[voffset] = this.offset();
    }
    /**
     * @returns Offset relative to the end of the buffer.
     */
    offset() {
      return this.bb.capacity() - this.space;
    }
    /**
     * Doubles the size of the backing ByteBuffer and copies the old data towards
     * the end of the new buffer (since we build the buffer backwards).
     *
     * @param bb The current buffer with the existing data
     * @returns A new byte buffer with the old data copied
     * to it. The data is located at the end of the buffer.
     *
     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
     * it a uint8Array we need to suppress the type check:
     * @suppress {checkTypes}
     */
    static growByteBuffer(bb) {
      const old_buf_size = bb.capacity();
      if (old_buf_size & 3221225472) {
        throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");
      }
      const new_buf_size = old_buf_size << 1;
      const nbb = ByteBuffer.allocate(new_buf_size);
      nbb.setPosition(new_buf_size - old_buf_size);
      nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
      return nbb;
    }
    /**
     * Adds on offset, relative to where it will be written.
     *
     * @param offset The offset to add.
     */
    addOffset(offset) {
      this.prep(SIZEOF_INT, 0);
      this.writeInt32(this.offset() - offset + SIZEOF_INT);
    }
    /**
     * Start encoding a new object in the buffer.  Users will not usually need to
     * call this directly. The FlatBuffers compiler will generate helper methods
     * that call this method internally.
     */
    startObject(numfields) {
      this.notNested();
      if (this.vtable == null) {
        this.vtable = [];
      }
      this.vtable_in_use = numfields;
      for (let i = 0; i < numfields; i++) {
        this.vtable[i] = 0;
      }
      this.isNested = true;
      this.object_start = this.offset();
    }
    /**
     * Finish off writing the object that is under construction.
     *
     * @returns The offset to the object inside `dataBuffer`
     */
    endObject() {
      if (this.vtable == null || !this.isNested) {
        throw new Error("FlatBuffers: endObject called without startObject");
      }
      this.addInt32(0);
      const vtableloc = this.offset();
      let i = this.vtable_in_use - 1;
      for (; i >= 0 && this.vtable[i] == 0; i--) {
      }
      const trimmed_size = i + 1;
      for (; i >= 0; i--) {
        this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
      }
      const standard_fields = 2;
      this.addInt16(vtableloc - this.object_start);
      const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
      this.addInt16(len);
      let existing_vtable = 0;
      const vt1 = this.space;
      outer_loop:
        for (i = 0; i < this.vtables.length; i++) {
          const vt2 = this.bb.capacity() - this.vtables[i];
          if (len == this.bb.readInt16(vt2)) {
            for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
              if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                continue outer_loop;
              }
            }
            existing_vtable = this.vtables[i];
            break;
          }
        }
      if (existing_vtable) {
        this.space = this.bb.capacity() - vtableloc;
        this.bb.writeInt32(this.space, existing_vtable - vtableloc);
      } else {
        this.vtables.push(this.offset());
        this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
      }
      this.isNested = false;
      return vtableloc;
    }
    /**
     * Finalize a buffer, poiting to the given `root_table`.
     */
    finish(root_table, opt_file_identifier, opt_size_prefix) {
      const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
      if (opt_file_identifier) {
        const file_identifier = opt_file_identifier;
        this.prep(this.minalign, SIZEOF_INT + FILE_IDENTIFIER_LENGTH + size_prefix);
        if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
          throw new TypeError("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
        }
        for (let i = FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
          this.writeInt8(file_identifier.charCodeAt(i));
        }
      }
      this.prep(this.minalign, SIZEOF_INT + size_prefix);
      this.addOffset(root_table);
      if (size_prefix) {
        this.addInt32(this.bb.capacity() - this.space);
      }
      this.bb.setPosition(this.space);
    }
    /**
     * Finalize a size prefixed buffer, pointing to the given `root_table`.
     */
    finishSizePrefixed(root_table, opt_file_identifier) {
      this.finish(root_table, opt_file_identifier, true);
    }
    /**
     * This checks a required field has been set in a given table that has
     * just been constructed.
     */
    requiredField(table, field) {
      const table_start = this.bb.capacity() - table;
      const vtable_start = table_start - this.bb.readInt32(table_start);
      const ok = field < this.bb.readInt16(vtable_start) && this.bb.readInt16(vtable_start + field) != 0;
      if (!ok) {
        throw new TypeError("FlatBuffers: field " + field + " must be set");
      }
    }
    /**
     * Start a new array/vector of objects.  Users usually will not call
     * this directly. The FlatBuffers compiler will create a start/end
     * method for vector types in generated code.
     *
     * @param elem_size The size of each element in the array
     * @param num_elems The number of elements in the array
     * @param alignment The alignment of the array
     */
    startVector(elem_size, num_elems, alignment) {
      this.notNested();
      this.vector_num_elems = num_elems;
      this.prep(SIZEOF_INT, elem_size * num_elems);
      this.prep(alignment, elem_size * num_elems);
    }
    /**
     * Finish off the creation of an array and all its elements. The array must be
     * created with `startVector`.
     *
     * @returns The offset at which the newly created array
     * starts.
     */
    endVector() {
      this.writeInt32(this.vector_num_elems);
      return this.offset();
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If the string passed has
     * already been seen, we return the offset of the already written string
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createSharedString(s) {
      if (!s) {
        return 0;
      }
      if (!this.string_maps) {
        this.string_maps = /* @__PURE__ */ new Map();
      }
      if (this.string_maps.has(s)) {
        return this.string_maps.get(s);
      }
      const offset = this.createString(s);
      this.string_maps.set(s, offset);
      return offset;
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createString(s) {
      if (s === null || s === void 0) {
        return 0;
      }
      let utf8;
      if (s instanceof Uint8Array) {
        utf8 = s;
      } else {
        utf8 = this.text_encoder.encode(s);
      }
      this.addInt8(0);
      this.startVector(1, utf8.length, 1);
      this.bb.setPosition(this.space -= utf8.length);
      this.bb.bytes().set(utf8, this.space);
      return this.endVector();
    }
    /**
     * Create a byte vector.
     *
     * @param v The bytes to add
     * @returns The offset in the buffer where the byte vector starts
     */
    createByteVector(v) {
      if (v === null || v === void 0) {
        return 0;
      }
      this.startVector(1, v.length, 1);
      this.bb.setPosition(this.space -= v.length);
      this.bb.bytes().set(v, this.space);
      return this.endVector();
    }
    /**
     * A helper function to pack an object
     *
     * @returns offset of obj
     */
    createObjectOffset(obj) {
      if (obj === null) {
        return 0;
      }
      if (typeof obj === "string") {
        return this.createString(obj);
      } else {
        return obj.pack(this);
      }
    }
    /**
     * A helper function to pack a list of object
     *
     * @returns list of offsets of each non null object
     */
    createObjectOffsetList(list) {
      const ret = [];
      for (let i = 0; i < list.length; ++i) {
        const val = list[i];
        if (val !== null) {
          ret.push(this.createObjectOffset(val));
        } else {
          throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.");
        }
      }
      return ret;
    }
    createStructOffsetList(list, startFunc) {
      startFunc(this, list.length);
      this.createObjectOffsetList(list.slice().reverse());
      return this.endVector();
    }
  };

  // src/generated/furnace/clear-error-command.ts
  var ClearErrorCommand = class _ClearErrorCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsClearErrorCommand(bb, obj) {
      return (obj || new _ClearErrorCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsClearErrorCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ClearErrorCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startClearErrorCommand(builder) {
      builder.startObject(0);
    }
    static endClearErrorCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createClearErrorCommand(builder) {
      _ClearErrorCommand.startClearErrorCommand(builder);
      return _ClearErrorCommand.endClearErrorCommand(builder);
    }
    unpack() {
      return new ClearErrorCommandT();
    }
    unpackTo(_o) {
    }
  };
  var ClearErrorCommandT = class {
    constructor() {
    }
    pack(builder) {
      return ClearErrorCommand.createClearErrorCommand(builder);
    }
  };

  // src/generated/furnace/delete-program-request.ts
  var DeleteProgramRequest = class _DeleteProgramRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDeleteProgramRequest(bb, obj) {
      return (obj || new _DeleteProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDeleteProgramRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _DeleteProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startDeleteProgramRequest(builder) {
      builder.startObject(1);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static endDeleteProgramRequest(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      return offset;
    }
    static createDeleteProgramRequest(builder, nameOffset) {
      _DeleteProgramRequest.startDeleteProgramRequest(builder);
      _DeleteProgramRequest.addName(builder, nameOffset);
      return _DeleteProgramRequest.endDeleteProgramRequest(builder);
    }
    unpack() {
      return new DeleteProgramRequestT(
        this.name()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
    }
  };
  var DeleteProgramRequestT = class {
    constructor(name = null) {
      this.name = name;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      return DeleteProgramRequest.createDeleteProgramRequest(
        builder,
        name
      );
    }
  };

  // src/generated/furnace/get-debug-info-request.ts
  var GetDebugInfoRequest = class _GetDebugInfoRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsGetDebugInfoRequest(bb, obj) {
      return (obj || new _GetDebugInfoRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsGetDebugInfoRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _GetDebugInfoRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startGetDebugInfoRequest(builder) {
      builder.startObject(0);
    }
    static endGetDebugInfoRequest(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createGetDebugInfoRequest(builder) {
      _GetDebugInfoRequest.startGetDebugInfoRequest(builder);
      return _GetDebugInfoRequest.endGetDebugInfoRequest(builder);
    }
    unpack() {
      return new GetDebugInfoRequestT();
    }
    unpackTo(_o) {
    }
  };
  var GetDebugInfoRequestT = class {
    constructor() {
    }
    pack(builder) {
      return GetDebugInfoRequest.createGetDebugInfoRequest(builder);
    }
  };

  // src/generated/furnace/get-log-request.ts
  var GetLogRequest = class _GetLogRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsGetLogRequest(bb, obj) {
      return (obj || new _GetLogRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsGetLogRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _GetLogRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startGetLogRequest(builder) {
      builder.startObject(1);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static endGetLogRequest(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      return offset;
    }
    static createGetLogRequest(builder, nameOffset) {
      _GetLogRequest.startGetLogRequest(builder);
      _GetLogRequest.addName(builder, nameOffset);
      return _GetLogRequest.endGetLogRequest(builder);
    }
    unpack() {
      return new GetLogRequestT(
        this.name()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
    }
  };
  var GetLogRequestT = class {
    constructor(name = null) {
      this.name = name;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      return GetLogRequest.createGetLogRequest(
        builder,
        name
      );
    }
  };

  // src/generated/furnace/get-preferences-request.ts
  var GetPreferencesRequest = class _GetPreferencesRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsGetPreferencesRequest(bb, obj) {
      return (obj || new _GetPreferencesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsGetPreferencesRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _GetPreferencesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startGetPreferencesRequest(builder) {
      builder.startObject(0);
    }
    static endGetPreferencesRequest(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createGetPreferencesRequest(builder) {
      _GetPreferencesRequest.startGetPreferencesRequest(builder);
      return _GetPreferencesRequest.endGetPreferencesRequest(builder);
    }
    unpack() {
      return new GetPreferencesRequestT();
    }
    unpackTo(_o) {
    }
  };
  var GetPreferencesRequestT = class {
    constructor() {
    }
    pack(builder) {
      return GetPreferencesRequest.createGetPreferencesRequest(builder);
    }
  };

  // src/generated/furnace/get-program-request.ts
  var GetProgramRequest = class _GetProgramRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsGetProgramRequest(bb, obj) {
      return (obj || new _GetProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsGetProgramRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _GetProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startGetProgramRequest(builder) {
      builder.startObject(1);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static endGetProgramRequest(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      return offset;
    }
    static createGetProgramRequest(builder, nameOffset) {
      _GetProgramRequest.startGetProgramRequest(builder);
      _GetProgramRequest.addName(builder, nameOffset);
      return _GetProgramRequest.endGetProgramRequest(builder);
    }
    unpack() {
      return new GetProgramRequestT(
        this.name()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
    }
  };
  var GetProgramRequestT = class {
    constructor(name = null) {
      this.name = name;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      return GetProgramRequest.createGetProgramRequest(
        builder,
        name
      );
    }
  };

  // src/generated/furnace/history-request.ts
  var HistoryRequest = class _HistoryRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsHistoryRequest(bb, obj) {
      return (obj || new _HistoryRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHistoryRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _HistoryRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    sinceMs() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    limit() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    static startHistoryRequest(builder) {
      builder.startObject(2);
    }
    static addSinceMs(builder, sinceMs) {
      builder.addFieldInt64(0, sinceMs, BigInt("0"));
    }
    static addLimit(builder, limit) {
      builder.addFieldInt32(1, limit, 0);
    }
    static endHistoryRequest(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createHistoryRequest(builder, sinceMs, limit) {
      _HistoryRequest.startHistoryRequest(builder);
      _HistoryRequest.addSinceMs(builder, sinceMs);
      _HistoryRequest.addLimit(builder, limit);
      return _HistoryRequest.endHistoryRequest(builder);
    }
    unpack() {
      return new HistoryRequestT(
        this.sinceMs(),
        this.limit()
      );
    }
    unpackTo(_o) {
      _o.sinceMs = this.sinceMs();
      _o.limit = this.limit();
    }
  };
  var HistoryRequestT = class {
    constructor(sinceMs = BigInt("0"), limit = 0) {
      this.sinceMs = sinceMs;
      this.limit = limit;
    }
    pack(builder) {
      return HistoryRequest.createHistoryRequest(
        builder,
        this.sinceMs,
        this.limit
      );
    }
  };

  // src/generated/furnace/list-logs-request.ts
  var ListLogsRequest = class _ListLogsRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsListLogsRequest(bb, obj) {
      return (obj || new _ListLogsRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsListLogsRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ListLogsRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startListLogsRequest(builder) {
      builder.startObject(0);
    }
    static endListLogsRequest(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createListLogsRequest(builder) {
      _ListLogsRequest.startListLogsRequest(builder);
      return _ListLogsRequest.endListLogsRequest(builder);
    }
    unpack() {
      return new ListLogsRequestT();
    }
    unpackTo(_o) {
    }
  };
  var ListLogsRequestT = class {
    constructor() {
    }
    pack(builder) {
      return ListLogsRequest.createListLogsRequest(builder);
    }
  };

  // src/generated/furnace/list-programs-request.ts
  var ListProgramsRequest = class _ListProgramsRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsListProgramsRequest(bb, obj) {
      return (obj || new _ListProgramsRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsListProgramsRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ListProgramsRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startListProgramsRequest(builder) {
      builder.startObject(0);
    }
    static endListProgramsRequest(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createListProgramsRequest(builder) {
      _ListProgramsRequest.startListProgramsRequest(builder);
      return _ListProgramsRequest.endListProgramsRequest(builder);
    }
    unpack() {
      return new ListProgramsRequestT();
    }
    unpackTo(_o) {
    }
  };
  var ListProgramsRequestT = class {
    constructor() {
    }
    pack(builder) {
      return ListProgramsRequest.createListProgramsRequest(builder);
    }
  };

  // src/generated/furnace/load-command.ts
  var LoadCommand = class _LoadCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsLoadCommand(bb, obj) {
      return (obj || new _LoadCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLoadCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _LoadCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    program(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startLoadCommand(builder) {
      builder.startObject(1);
    }
    static addProgram(builder, programOffset) {
      builder.addFieldOffset(0, programOffset, 0);
    }
    static endLoadCommand(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      return offset;
    }
    static createLoadCommand(builder, programOffset) {
      _LoadCommand.startLoadCommand(builder);
      _LoadCommand.addProgram(builder, programOffset);
      return _LoadCommand.endLoadCommand(builder);
    }
    unpack() {
      return new LoadCommandT(
        this.program()
      );
    }
    unpackTo(_o) {
      _o.program = this.program();
    }
  };
  var LoadCommandT = class {
    constructor(program = null) {
      this.program = program;
    }
    pack(builder) {
      const program = this.program !== null ? builder.createString(this.program) : 0;
      return LoadCommand.createLoadCommand(
        builder,
        program
      );
    }
  };

  // src/generated/furnace/pause-command.ts
  var PauseCommand = class _PauseCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsPauseCommand(bb, obj) {
      return (obj || new _PauseCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsPauseCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _PauseCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startPauseCommand(builder) {
      builder.startObject(0);
    }
    static endPauseCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createPauseCommand(builder) {
      _PauseCommand.startPauseCommand(builder);
      return _PauseCommand.endPauseCommand(builder);
    }
    unpack() {
      return new PauseCommandT();
    }
    unpackTo(_o) {
    }
  };
  var PauseCommandT = class {
    constructor() {
    }
    pack(builder) {
      return PauseCommand.createPauseCommand(builder);
    }
  };

  // src/generated/furnace/resume-command.ts
  var ResumeCommand = class _ResumeCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsResumeCommand(bb, obj) {
      return (obj || new _ResumeCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsResumeCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ResumeCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startResumeCommand(builder) {
      builder.startObject(0);
    }
    static endResumeCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createResumeCommand(builder) {
      _ResumeCommand.startResumeCommand(builder);
      return _ResumeCommand.endResumeCommand(builder);
    }
    unpack() {
      return new ResumeCommandT();
    }
    unpackTo(_o) {
    }
  };
  var ResumeCommandT = class {
    constructor() {
    }
    pack(builder) {
      return ResumeCommand.createResumeCommand(builder);
    }
  };

  // src/generated/furnace/save-preferences-request.ts
  var SavePreferencesRequest = class _SavePreferencesRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsSavePreferencesRequest(bb, obj) {
      return (obj || new _SavePreferencesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsSavePreferencesRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _SavePreferencesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    json(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startSavePreferencesRequest(builder) {
      builder.startObject(1);
    }
    static addJson(builder, jsonOffset) {
      builder.addFieldOffset(0, jsonOffset, 0);
    }
    static endSavePreferencesRequest(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      return offset;
    }
    static createSavePreferencesRequest(builder, jsonOffset) {
      _SavePreferencesRequest.startSavePreferencesRequest(builder);
      _SavePreferencesRequest.addJson(builder, jsonOffset);
      return _SavePreferencesRequest.endSavePreferencesRequest(builder);
    }
    unpack() {
      return new SavePreferencesRequestT(
        this.json()
      );
    }
    unpackTo(_o) {
      _o.json = this.json();
    }
  };
  var SavePreferencesRequestT = class {
    constructor(json = null) {
      this.json = json;
    }
    pack(builder) {
      const json = this.json !== null ? builder.createString(this.json) : 0;
      return SavePreferencesRequest.createSavePreferencesRequest(
        builder,
        json
      );
    }
  };

  // src/generated/furnace/save-program-request.ts
  var SaveProgramRequest = class _SaveProgramRequest {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsSaveProgramRequest(bb, obj) {
      return (obj || new _SaveProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsSaveProgramRequest(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _SaveProgramRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    content(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startSaveProgramRequest(builder) {
      builder.startObject(2);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addContent(builder, contentOffset) {
      builder.addFieldOffset(1, contentOffset, 0);
    }
    static endSaveProgramRequest(builder) {
      const offset = builder.endObject();
      builder.requiredField(offset, 4);
      builder.requiredField(offset, 6);
      return offset;
    }
    static createSaveProgramRequest(builder, nameOffset, contentOffset) {
      _SaveProgramRequest.startSaveProgramRequest(builder);
      _SaveProgramRequest.addName(builder, nameOffset);
      _SaveProgramRequest.addContent(builder, contentOffset);
      return _SaveProgramRequest.endSaveProgramRequest(builder);
    }
    unpack() {
      return new SaveProgramRequestT(
        this.name(),
        this.content()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
      _o.content = this.content();
    }
  };
  var SaveProgramRequestT = class {
    constructor(name = null, content = null) {
      this.name = name;
      this.content = content;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      const content = this.content !== null ? builder.createString(this.content) : 0;
      return SaveProgramRequest.createSaveProgramRequest(
        builder,
        name,
        content
      );
    }
  };

  // src/generated/furnace/set-temp-command.ts
  var SetTempCommand = class _SetTempCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsSetTempCommand(bb, obj) {
      return (obj || new _SetTempCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsSetTempCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _SetTempCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    temperature() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    static startSetTempCommand(builder) {
      builder.startObject(1);
    }
    static addTemperature(builder, temperature) {
      builder.addFieldFloat32(0, temperature, 0);
    }
    static endSetTempCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createSetTempCommand(builder, temperature) {
      _SetTempCommand.startSetTempCommand(builder);
      _SetTempCommand.addTemperature(builder, temperature);
      return _SetTempCommand.endSetTempCommand(builder);
    }
    unpack() {
      return new SetTempCommandT(
        this.temperature()
      );
    }
    unpackTo(_o) {
      _o.temperature = this.temperature();
    }
  };
  var SetTempCommandT = class {
    constructor(temperature = 0) {
      this.temperature = temperature;
    }
    pack(builder) {
      return SetTempCommand.createSetTempCommand(
        builder,
        this.temperature
      );
    }
  };

  // src/generated/furnace/set-time-scale-command.ts
  var SetTimeScaleCommand = class _SetTimeScaleCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsSetTimeScaleCommand(bb, obj) {
      return (obj || new _SetTimeScaleCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsSetTimeScaleCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _SetTimeScaleCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    timeScale() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    static startSetTimeScaleCommand(builder) {
      builder.startObject(1);
    }
    static addTimeScale(builder, timeScale2) {
      builder.addFieldFloat32(0, timeScale2, 0);
    }
    static endSetTimeScaleCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createSetTimeScaleCommand(builder, timeScale2) {
      _SetTimeScaleCommand.startSetTimeScaleCommand(builder);
      _SetTimeScaleCommand.addTimeScale(builder, timeScale2);
      return _SetTimeScaleCommand.endSetTimeScaleCommand(builder);
    }
    unpack() {
      return new SetTimeScaleCommandT(
        this.timeScale()
      );
    }
    unpackTo(_o) {
      _o.timeScale = this.timeScale();
    }
  };
  var SetTimeScaleCommandT = class {
    constructor(timeScale2 = 0) {
      this.timeScale = timeScale2;
    }
    pack(builder) {
      return SetTimeScaleCommand.createSetTimeScaleCommand(
        builder,
        this.timeScale
      );
    }
  };

  // src/generated/furnace/start-command.ts
  var StartCommand = class _StartCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsStartCommand(bb, obj) {
      return (obj || new _StartCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStartCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _StartCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    segment() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    minute() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    static startStartCommand(builder) {
      builder.startObject(2);
    }
    static addSegment(builder, segment) {
      builder.addFieldInt32(0, segment, 0);
    }
    static addMinute(builder, minute) {
      builder.addFieldInt32(1, minute, 0);
    }
    static endStartCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createStartCommand(builder, segment, minute) {
      _StartCommand.startStartCommand(builder);
      _StartCommand.addSegment(builder, segment);
      _StartCommand.addMinute(builder, minute);
      return _StartCommand.endStartCommand(builder);
    }
    unpack() {
      return new StartCommandT(
        this.segment(),
        this.minute()
      );
    }
    unpackTo(_o) {
      _o.segment = this.segment();
      _o.minute = this.minute();
    }
  };
  var StartCommandT = class {
    constructor(segment = 0, minute = 0) {
      this.segment = segment;
      this.minute = minute;
    }
    pack(builder) {
      return StartCommand.createStartCommand(
        builder,
        this.segment,
        this.minute
      );
    }
  };

  // src/generated/furnace/stop-command.ts
  var StopCommand = class _StopCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsStopCommand(bb, obj) {
      return (obj || new _StopCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStopCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _StopCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startStopCommand(builder) {
      builder.startObject(0);
    }
    static endStopCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createStopCommand(builder) {
      _StopCommand.startStopCommand(builder);
      return _StopCommand.endStopCommand(builder);
    }
    unpack() {
      return new StopCommandT();
    }
    unpackTo(_o) {
    }
  };
  var StopCommandT = class {
    constructor() {
    }
    pack(builder) {
      return StopCommand.createStopCommand(builder);
    }
  };

  // src/generated/furnace/unload-command.ts
  var UnloadCommand = class _UnloadCommand {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsUnloadCommand(bb, obj) {
      return (obj || new _UnloadCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsUnloadCommand(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _UnloadCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startUnloadCommand(builder) {
      builder.startObject(0);
    }
    static endUnloadCommand(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createUnloadCommand(builder) {
      _UnloadCommand.startUnloadCommand(builder);
      return _UnloadCommand.endUnloadCommand(builder);
    }
    unpack() {
      return new UnloadCommandT();
    }
    unpackTo(_o) {
    }
  };
  var UnloadCommandT = class {
    constructor() {
    }
    pack(builder) {
      return UnloadCommand.createUnloadCommand(builder);
    }
  };

  // src/generated/furnace/client-message.ts
  var ClientMessage = /* @__PURE__ */ ((ClientMessage2) => {
    ClientMessage2[ClientMessage2["NONE"] = 0] = "NONE";
    ClientMessage2[ClientMessage2["StartCommand"] = 1] = "StartCommand";
    ClientMessage2[ClientMessage2["PauseCommand"] = 2] = "PauseCommand";
    ClientMessage2[ClientMessage2["ResumeCommand"] = 3] = "ResumeCommand";
    ClientMessage2[ClientMessage2["StopCommand"] = 4] = "StopCommand";
    ClientMessage2[ClientMessage2["LoadCommand"] = 5] = "LoadCommand";
    ClientMessage2[ClientMessage2["UnloadCommand"] = 6] = "UnloadCommand";
    ClientMessage2[ClientMessage2["SetTempCommand"] = 7] = "SetTempCommand";
    ClientMessage2[ClientMessage2["ClearErrorCommand"] = 8] = "ClearErrorCommand";
    ClientMessage2[ClientMessage2["SetTimeScaleCommand"] = 9] = "SetTimeScaleCommand";
    ClientMessage2[ClientMessage2["HistoryRequest"] = 10] = "HistoryRequest";
    ClientMessage2[ClientMessage2["ListProgramsRequest"] = 11] = "ListProgramsRequest";
    ClientMessage2[ClientMessage2["GetProgramRequest"] = 12] = "GetProgramRequest";
    ClientMessage2[ClientMessage2["SaveProgramRequest"] = 13] = "SaveProgramRequest";
    ClientMessage2[ClientMessage2["DeleteProgramRequest"] = 14] = "DeleteProgramRequest";
    ClientMessage2[ClientMessage2["GetPreferencesRequest"] = 15] = "GetPreferencesRequest";
    ClientMessage2[ClientMessage2["SavePreferencesRequest"] = 16] = "SavePreferencesRequest";
    ClientMessage2[ClientMessage2["GetDebugInfoRequest"] = 17] = "GetDebugInfoRequest";
    ClientMessage2[ClientMessage2["ListLogsRequest"] = 18] = "ListLogsRequest";
    ClientMessage2[ClientMessage2["GetLogRequest"] = 19] = "GetLogRequest";
    return ClientMessage2;
  })(ClientMessage || {});
  function unionToClientMessage(type, accessor) {
    switch (ClientMessage[type]) {
      case "NONE":
        return null;
      case "StartCommand":
        return accessor(new StartCommand());
      case "PauseCommand":
        return accessor(new PauseCommand());
      case "ResumeCommand":
        return accessor(new ResumeCommand());
      case "StopCommand":
        return accessor(new StopCommand());
      case "LoadCommand":
        return accessor(new LoadCommand());
      case "UnloadCommand":
        return accessor(new UnloadCommand());
      case "SetTempCommand":
        return accessor(new SetTempCommand());
      case "ClearErrorCommand":
        return accessor(new ClearErrorCommand());
      case "SetTimeScaleCommand":
        return accessor(new SetTimeScaleCommand());
      case "HistoryRequest":
        return accessor(new HistoryRequest());
      case "ListProgramsRequest":
        return accessor(new ListProgramsRequest());
      case "GetProgramRequest":
        return accessor(new GetProgramRequest());
      case "SaveProgramRequest":
        return accessor(new SaveProgramRequest());
      case "DeleteProgramRequest":
        return accessor(new DeleteProgramRequest());
      case "GetPreferencesRequest":
        return accessor(new GetPreferencesRequest());
      case "SavePreferencesRequest":
        return accessor(new SavePreferencesRequest());
      case "GetDebugInfoRequest":
        return accessor(new GetDebugInfoRequest());
      case "ListLogsRequest":
        return accessor(new ListLogsRequest());
      case "GetLogRequest":
        return accessor(new GetLogRequest());
      default:
        return null;
    }
  }

  // src/generated/furnace/client-envelope.ts
  var ClientEnvelope = class _ClientEnvelope {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsClientEnvelope(bb, obj) {
      return (obj || new _ClientEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsClientEnvelope(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ClientEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    requestId() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    messageType() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
    }
    message(obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
    }
    static startClientEnvelope(builder) {
      builder.startObject(3);
    }
    static addRequestId(builder, requestId) {
      builder.addFieldInt32(0, requestId, 0);
    }
    static addMessageType(builder, messageType) {
      builder.addFieldInt8(1, messageType, 0 /* NONE */);
    }
    static addMessage(builder, messageOffset) {
      builder.addFieldOffset(2, messageOffset, 0);
    }
    static endClientEnvelope(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createClientEnvelope(builder, requestId, messageType, messageOffset) {
      _ClientEnvelope.startClientEnvelope(builder);
      _ClientEnvelope.addRequestId(builder, requestId);
      _ClientEnvelope.addMessageType(builder, messageType);
      _ClientEnvelope.addMessage(builder, messageOffset);
      return _ClientEnvelope.endClientEnvelope(builder);
    }
    unpack() {
      return new ClientEnvelopeT(
        this.requestId(),
        this.messageType(),
        (() => {
          const temp = unionToClientMessage(this.messageType(), this.message.bind(this));
          if (temp === null) {
            return null;
          }
          return temp.unpack();
        })()
      );
    }
    unpackTo(_o) {
      _o.requestId = this.requestId();
      _o.messageType = this.messageType();
      _o.message = (() => {
        const temp = unionToClientMessage(this.messageType(), this.message.bind(this));
        if (temp === null) {
          return null;
        }
        return temp.unpack();
      })();
    }
  };
  var ClientEnvelopeT = class {
    constructor(requestId = 0, messageType = 0 /* NONE */, message = null) {
      this.requestId = requestId;
      this.messageType = messageType;
      this.message = message;
    }
    pack(builder) {
      const message = builder.createObjectOffset(this.message);
      return ClientEnvelope.createClientEnvelope(
        builder,
        this.requestId,
        this.messageType,
        message
      );
    }
  };

  // src/generated/furnace/ack.ts
  var Ack = class _Ack {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsAck(bb, obj) {
      return (obj || new _Ack()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsAck(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Ack()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    success() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    requestId() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    error(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startAck(builder) {
      builder.startObject(3);
    }
    static addSuccess(builder, success) {
      builder.addFieldInt8(0, +success, 0);
    }
    static addRequestId(builder, requestId) {
      builder.addFieldInt32(1, requestId, 0);
    }
    static addError(builder, errorOffset) {
      builder.addFieldOffset(2, errorOffset, 0);
    }
    static endAck(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createAck(builder, success, requestId, errorOffset) {
      _Ack.startAck(builder);
      _Ack.addSuccess(builder, success);
      _Ack.addRequestId(builder, requestId);
      _Ack.addError(builder, errorOffset);
      return _Ack.endAck(builder);
    }
    unpack() {
      return new AckT(
        this.success(),
        this.requestId(),
        this.error()
      );
    }
    unpackTo(_o) {
      _o.success = this.success();
      _o.requestId = this.requestId();
      _o.error = this.error();
    }
  };
  var AckT = class {
    constructor(success = false, requestId = 0, error = null) {
      this.success = success;
      this.requestId = requestId;
      this.error = error;
    }
    pack(builder) {
      const error = this.error !== null ? builder.createString(this.error) : 0;
      return Ack.createAck(
        builder,
        this.success,
        this.requestId,
        error
      );
    }
  };

  // src/generated/furnace/debug-info-response.ts
  var DebugInfoResponse = class _DebugInfoResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDebugInfoResponse(bb, obj) {
      return (obj || new _DebugInfoResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDebugInfoResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _DebugInfoResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    json(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startDebugInfoResponse(builder) {
      builder.startObject(1);
    }
    static addJson(builder, jsonOffset) {
      builder.addFieldOffset(0, jsonOffset, 0);
    }
    static endDebugInfoResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createDebugInfoResponse(builder, jsonOffset) {
      _DebugInfoResponse.startDebugInfoResponse(builder);
      _DebugInfoResponse.addJson(builder, jsonOffset);
      return _DebugInfoResponse.endDebugInfoResponse(builder);
    }
    unpack() {
      return new DebugInfoResponseT(
        this.json()
      );
    }
    unpackTo(_o) {
      _o.json = this.json();
    }
  };
  var DebugInfoResponseT = class {
    constructor(json = null) {
      this.json = json;
    }
    pack(builder) {
      const json = this.json !== null ? builder.createString(this.json) : 0;
      return DebugInfoResponse.createDebugInfoResponse(
        builder,
        json
      );
    }
  };

  // src/generated/furnace/error.ts
  var Error2 = class _Error {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsError(bb, obj) {
      return (obj || new _Error()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsError(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Error()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    code() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    message(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startError(builder) {
      builder.startObject(2);
    }
    static addCode(builder, code) {
      builder.addFieldInt32(0, code, 0);
    }
    static addMessage(builder, messageOffset) {
      builder.addFieldOffset(1, messageOffset, 0);
    }
    static endError(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createError(builder, code, messageOffset) {
      _Error.startError(builder);
      _Error.addCode(builder, code);
      _Error.addMessage(builder, messageOffset);
      return _Error.endError(builder);
    }
    unpack() {
      return new ErrorT(
        this.code(),
        this.message()
      );
    }
    unpackTo(_o) {
      _o.code = this.code();
      _o.message = this.message();
    }
  };
  var ErrorT = class {
    constructor(code = 0, message = null) {
      this.code = code;
      this.message = message;
    }
    pack(builder) {
      const message = this.message !== null ? builder.createString(this.message) : 0;
      return Error2.createError(
        builder,
        this.code,
        message
      );
    }
  };

  // src/generated/furnace/history-point.ts
  var HistoryPoint = class _HistoryPoint {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsHistoryPoint(bb, obj) {
      return (obj || new _HistoryPoint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHistoryPoint(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _HistoryPoint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    timestampMs() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    kilnTemp() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    setTemp() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    heatPercent() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : 0;
    }
    envTemp() {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    caseTemp() {
      const offset = this.bb.__offset(this.bb_pos, 14);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    markerType() {
      const offset = this.bb.__offset(this.bb_pos, 16);
      return offset ? this.bb.readInt8(this.bb_pos + offset) : null;
    }
    markerValue(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 18);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startHistoryPoint(builder) {
      builder.startObject(8);
    }
    static addTimestampMs(builder, timestampMs) {
      builder.addFieldInt64(0, timestampMs, BigInt("0"));
    }
    static addKilnTemp(builder, kilnTemp) {
      builder.addFieldFloat32(1, kilnTemp, 0);
    }
    static addSetTemp(builder, setTemp) {
      builder.addFieldFloat32(2, setTemp, 0);
    }
    static addHeatPercent(builder, heatPercent) {
      builder.addFieldInt8(3, heatPercent, 0);
    }
    static addEnvTemp(builder, envTemp) {
      builder.addFieldFloat32(4, envTemp, 0);
    }
    static addCaseTemp(builder, caseTemp) {
      builder.addFieldFloat32(5, caseTemp, 0);
    }
    static addMarkerType(builder, markerType) {
      builder.addFieldInt8(6, markerType, null);
    }
    static addMarkerValue(builder, markerValueOffset) {
      builder.addFieldOffset(7, markerValueOffset, 0);
    }
    static endHistoryPoint(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createHistoryPoint(builder, timestampMs, kilnTemp, setTemp, heatPercent, envTemp, caseTemp, markerType, markerValueOffset) {
      _HistoryPoint.startHistoryPoint(builder);
      _HistoryPoint.addTimestampMs(builder, timestampMs);
      _HistoryPoint.addKilnTemp(builder, kilnTemp);
      _HistoryPoint.addSetTemp(builder, setTemp);
      _HistoryPoint.addHeatPercent(builder, heatPercent);
      _HistoryPoint.addEnvTemp(builder, envTemp);
      _HistoryPoint.addCaseTemp(builder, caseTemp);
      if (markerType !== null)
        _HistoryPoint.addMarkerType(builder, markerType);
      _HistoryPoint.addMarkerValue(builder, markerValueOffset);
      return _HistoryPoint.endHistoryPoint(builder);
    }
    unpack() {
      return new HistoryPointT(
        this.timestampMs(),
        this.kilnTemp(),
        this.setTemp(),
        this.heatPercent(),
        this.envTemp(),
        this.caseTemp(),
        this.markerType(),
        this.markerValue()
      );
    }
    unpackTo(_o) {
      _o.timestampMs = this.timestampMs();
      _o.kilnTemp = this.kilnTemp();
      _o.setTemp = this.setTemp();
      _o.heatPercent = this.heatPercent();
      _o.envTemp = this.envTemp();
      _o.caseTemp = this.caseTemp();
      _o.markerType = this.markerType();
      _o.markerValue = this.markerValue();
    }
  };
  var HistoryPointT = class {
    constructor(timestampMs = BigInt("0"), kilnTemp = 0, setTemp = 0, heatPercent = 0, envTemp = 0, caseTemp = 0, markerType = null, markerValue = null) {
      this.timestampMs = timestampMs;
      this.kilnTemp = kilnTemp;
      this.setTemp = setTemp;
      this.heatPercent = heatPercent;
      this.envTemp = envTemp;
      this.caseTemp = caseTemp;
      this.markerType = markerType;
      this.markerValue = markerValue;
    }
    pack(builder) {
      const markerValue = this.markerValue !== null ? builder.createString(this.markerValue) : 0;
      return HistoryPoint.createHistoryPoint(
        builder,
        this.timestampMs,
        this.kilnTemp,
        this.setTemp,
        this.heatPercent,
        this.envTemp,
        this.caseTemp,
        this.markerType,
        markerValue
      );
    }
  };

  // src/generated/furnace/history-response.ts
  var HistoryResponse = class _HistoryResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsHistoryResponse(bb, obj) {
      return (obj || new _HistoryResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsHistoryResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _HistoryResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    intervalMs() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    maxAgeMs() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    data(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? (obj || new HistoryPoint()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    dataLength() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startHistoryResponse(builder) {
      builder.startObject(3);
    }
    static addIntervalMs(builder, intervalMs) {
      builder.addFieldInt32(0, intervalMs, 0);
    }
    static addMaxAgeMs(builder, maxAgeMs) {
      builder.addFieldInt32(1, maxAgeMs, 0);
    }
    static addData(builder, dataOffset) {
      builder.addFieldOffset(2, dataOffset, 0);
    }
    static createDataVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startDataVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endHistoryResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createHistoryResponse(builder, intervalMs, maxAgeMs, dataOffset) {
      _HistoryResponse.startHistoryResponse(builder);
      _HistoryResponse.addIntervalMs(builder, intervalMs);
      _HistoryResponse.addMaxAgeMs(builder, maxAgeMs);
      _HistoryResponse.addData(builder, dataOffset);
      return _HistoryResponse.endHistoryResponse(builder);
    }
    unpack() {
      return new HistoryResponseT(
        this.intervalMs(),
        this.maxAgeMs(),
        this.bb.createObjList(this.data.bind(this), this.dataLength())
      );
    }
    unpackTo(_o) {
      _o.intervalMs = this.intervalMs();
      _o.maxAgeMs = this.maxAgeMs();
      _o.data = this.bb.createObjList(this.data.bind(this), this.dataLength());
    }
  };
  var HistoryResponseT = class {
    constructor(intervalMs = 0, maxAgeMs = 0, data = []) {
      this.intervalMs = intervalMs;
      this.maxAgeMs = maxAgeMs;
      this.data = data;
    }
    pack(builder) {
      const data = HistoryResponse.createDataVector(builder, builder.createObjectOffsetList(this.data));
      return HistoryResponse.createHistoryResponse(
        builder,
        this.intervalMs,
        this.maxAgeMs,
        data
      );
    }
  };

  // src/generated/furnace/log-content-response.ts
  var LogContentResponse = class _LogContentResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsLogContentResponse(bb, obj) {
      return (obj || new _LogContentResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLogContentResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _LogContentResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    content(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startLogContentResponse(builder) {
      builder.startObject(2);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addContent(builder, contentOffset) {
      builder.addFieldOffset(1, contentOffset, 0);
    }
    static endLogContentResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createLogContentResponse(builder, nameOffset, contentOffset) {
      _LogContentResponse.startLogContentResponse(builder);
      _LogContentResponse.addName(builder, nameOffset);
      _LogContentResponse.addContent(builder, contentOffset);
      return _LogContentResponse.endLogContentResponse(builder);
    }
    unpack() {
      return new LogContentResponseT(
        this.name(),
        this.content()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
      _o.content = this.content();
    }
  };
  var LogContentResponseT = class {
    constructor(name = null, content = null) {
      this.name = name;
      this.content = content;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      const content = this.content !== null ? builder.createString(this.content) : 0;
      return LogContentResponse.createLogContentResponse(
        builder,
        name,
        content
      );
    }
  };

  // src/generated/furnace/log-info.ts
  var LogInfo = class _LogInfo {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsLogInfo(bb, obj) {
      return (obj || new _LogInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLogInfo(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _LogInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    size() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    static startLogInfo(builder) {
      builder.startObject(2);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addSize(builder, size) {
      builder.addFieldInt32(1, size, 0);
    }
    static endLogInfo(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createLogInfo(builder, nameOffset, size) {
      _LogInfo.startLogInfo(builder);
      _LogInfo.addName(builder, nameOffset);
      _LogInfo.addSize(builder, size);
      return _LogInfo.endLogInfo(builder);
    }
    unpack() {
      return new LogInfoT(
        this.name(),
        this.size()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
      _o.size = this.size();
    }
  };
  var LogInfoT = class {
    constructor(name = null, size = 0) {
      this.name = name;
      this.size = size;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      return LogInfo.createLogInfo(
        builder,
        name,
        this.size
      );
    }
  };

  // src/generated/furnace/log-list-response.ts
  var LogListResponse = class _LogListResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsLogListResponse(bb, obj) {
      return (obj || new _LogListResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLogListResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _LogListResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    logs(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? (obj || new LogInfo()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    logsLength() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startLogListResponse(builder) {
      builder.startObject(1);
    }
    static addLogs(builder, logsOffset) {
      builder.addFieldOffset(0, logsOffset, 0);
    }
    static createLogsVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startLogsVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endLogListResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createLogListResponse(builder, logsOffset) {
      _LogListResponse.startLogListResponse(builder);
      _LogListResponse.addLogs(builder, logsOffset);
      return _LogListResponse.endLogListResponse(builder);
    }
    unpack() {
      return new LogListResponseT(
        this.bb.createObjList(this.logs.bind(this), this.logsLength())
      );
    }
    unpackTo(_o) {
      _o.logs = this.bb.createObjList(this.logs.bind(this), this.logsLength());
    }
  };
  var LogListResponseT = class {
    constructor(logs = []) {
      this.logs = logs;
    }
    pack(builder) {
      const logs = LogListResponse.createLogsVector(builder, builder.createObjectOffsetList(this.logs));
      return LogListResponse.createLogListResponse(
        builder,
        logs
      );
    }
  };

  // src/generated/furnace/preferences-response.ts
  var PreferencesResponse = class _PreferencesResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsPreferencesResponse(bb, obj) {
      return (obj || new _PreferencesResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsPreferencesResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _PreferencesResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    json(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startPreferencesResponse(builder) {
      builder.startObject(1);
    }
    static addJson(builder, jsonOffset) {
      builder.addFieldOffset(0, jsonOffset, 0);
    }
    static endPreferencesResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createPreferencesResponse(builder, jsonOffset) {
      _PreferencesResponse.startPreferencesResponse(builder);
      _PreferencesResponse.addJson(builder, jsonOffset);
      return _PreferencesResponse.endPreferencesResponse(builder);
    }
    unpack() {
      return new PreferencesResponseT(
        this.json()
      );
    }
    unpackTo(_o) {
      _o.json = this.json();
    }
  };
  var PreferencesResponseT = class {
    constructor(json = null) {
      this.json = json;
    }
    pack(builder) {
      const json = this.json !== null ? builder.createString(this.json) : 0;
      return PreferencesResponse.createPreferencesResponse(
        builder,
        json
      );
    }
  };

  // src/generated/furnace/program-content-response.ts
  var ProgramContentResponse = class _ProgramContentResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsProgramContentResponse(bb, obj) {
      return (obj || new _ProgramContentResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsProgramContentResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ProgramContentResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    content(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startProgramContentResponse(builder) {
      builder.startObject(2);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addContent(builder, contentOffset) {
      builder.addFieldOffset(1, contentOffset, 0);
    }
    static endProgramContentResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createProgramContentResponse(builder, nameOffset, contentOffset) {
      _ProgramContentResponse.startProgramContentResponse(builder);
      _ProgramContentResponse.addName(builder, nameOffset);
      _ProgramContentResponse.addContent(builder, contentOffset);
      return _ProgramContentResponse.endProgramContentResponse(builder);
    }
    unpack() {
      return new ProgramContentResponseT(
        this.name(),
        this.content()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
      _o.content = this.content();
    }
  };
  var ProgramContentResponseT = class {
    constructor(name = null, content = null) {
      this.name = name;
      this.content = content;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      const content = this.content !== null ? builder.createString(this.content) : 0;
      return ProgramContentResponse.createProgramContentResponse(
        builder,
        name,
        content
      );
    }
  };

  // src/generated/furnace/program-info.ts
  var ProgramInfo = class _ProgramInfo {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsProgramInfo(bb, obj) {
      return (obj || new _ProgramInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsProgramInfo(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ProgramInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    size() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    description(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startProgramInfo(builder) {
      builder.startObject(3);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addSize(builder, size) {
      builder.addFieldInt32(1, size, 0);
    }
    static addDescription(builder, descriptionOffset) {
      builder.addFieldOffset(2, descriptionOffset, 0);
    }
    static endProgramInfo(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createProgramInfo(builder, nameOffset, size, descriptionOffset) {
      _ProgramInfo.startProgramInfo(builder);
      _ProgramInfo.addName(builder, nameOffset);
      _ProgramInfo.addSize(builder, size);
      _ProgramInfo.addDescription(builder, descriptionOffset);
      return _ProgramInfo.endProgramInfo(builder);
    }
    unpack() {
      return new ProgramInfoT(
        this.name(),
        this.size(),
        this.description()
      );
    }
    unpackTo(_o) {
      _o.name = this.name();
      _o.size = this.size();
      _o.description = this.description();
    }
  };
  var ProgramInfoT = class {
    constructor(name = null, size = 0, description = null) {
      this.name = name;
      this.size = size;
      this.description = description;
    }
    pack(builder) {
      const name = this.name !== null ? builder.createString(this.name) : 0;
      const description = this.description !== null ? builder.createString(this.description) : 0;
      return ProgramInfo.createProgramInfo(
        builder,
        name,
        this.size,
        description
      );
    }
  };

  // src/generated/furnace/program-list-response.ts
  var ProgramListResponse = class _ProgramListResponse {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsProgramListResponse(bb, obj) {
      return (obj || new _ProgramListResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsProgramListResponse(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ProgramListResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    programs(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? (obj || new ProgramInfo()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    programsLength() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startProgramListResponse(builder) {
      builder.startObject(1);
    }
    static addPrograms(builder, programsOffset) {
      builder.addFieldOffset(0, programsOffset, 0);
    }
    static createProgramsVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startProgramsVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endProgramListResponse(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createProgramListResponse(builder, programsOffset) {
      _ProgramListResponse.startProgramListResponse(builder);
      _ProgramListResponse.addPrograms(builder, programsOffset);
      return _ProgramListResponse.endProgramListResponse(builder);
    }
    unpack() {
      return new ProgramListResponseT(
        this.bb.createObjList(this.programs.bind(this), this.programsLength())
      );
    }
    unpackTo(_o) {
      _o.programs = this.bb.createObjList(this.programs.bind(this), this.programsLength());
    }
  };
  var ProgramListResponseT = class {
    constructor(programs = []) {
      this.programs = programs;
    }
    pack(builder) {
      const programs = ProgramListResponse.createProgramsVector(builder, builder.createObjectOffsetList(this.programs));
      return ProgramListResponse.createProgramListResponse(
        builder,
        programs
      );
    }
  };

  // src/generated/furnace/state.ts
  var State = class _State {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsState(bb, obj) {
      return (obj || new _State()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsState(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _State()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    programStatus() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* None */;
    }
    programName(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    kilnTemp() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    setTemp() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    envTemp() {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    caseTemp() {
      const offset = this.bb.__offset(this.bb_pos, 14);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    heatPercent() {
      const offset = this.bb.__offset(this.bb_pos, 16);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : 0;
    }
    tempChange() {
      const offset = this.bb.__offset(this.bb_pos, 18);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
    }
    step(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 20);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    progStartMs() {
      const offset = this.bb.__offset(this.bb_pos, 22);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    progEndMs() {
      const offset = this.bb.__offset(this.bb_pos, 24);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    currTimeMs() {
      const offset = this.bb.__offset(this.bb_pos, 26);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    errorMessage(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 28);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    isSimulator() {
      const offset = this.bb.__offset(this.bb_pos, 30);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    timeScale() {
      const offset = this.bb.__offset(this.bb_pos, 32);
      return offset ? this.bb.readFloat32(this.bb_pos + offset) : 1;
    }
    static startState(builder) {
      builder.startObject(15);
    }
    static addProgramStatus(builder, programStatus) {
      builder.addFieldInt8(0, programStatus, 0 /* None */);
    }
    static addProgramName(builder, programNameOffset) {
      builder.addFieldOffset(1, programNameOffset, 0);
    }
    static addKilnTemp(builder, kilnTemp) {
      builder.addFieldFloat32(2, kilnTemp, 0);
    }
    static addSetTemp(builder, setTemp) {
      builder.addFieldFloat32(3, setTemp, 0);
    }
    static addEnvTemp(builder, envTemp) {
      builder.addFieldFloat32(4, envTemp, 0);
    }
    static addCaseTemp(builder, caseTemp) {
      builder.addFieldFloat32(5, caseTemp, 0);
    }
    static addHeatPercent(builder, heatPercent) {
      builder.addFieldInt8(6, heatPercent, 0);
    }
    static addTempChange(builder, tempChange) {
      builder.addFieldFloat32(7, tempChange, 0);
    }
    static addStep(builder, stepOffset) {
      builder.addFieldOffset(8, stepOffset, 0);
    }
    static addProgStartMs(builder, progStartMs) {
      builder.addFieldInt64(9, progStartMs, BigInt("0"));
    }
    static addProgEndMs(builder, progEndMs) {
      builder.addFieldInt64(10, progEndMs, BigInt("0"));
    }
    static addCurrTimeMs(builder, currTimeMs) {
      builder.addFieldInt64(11, currTimeMs, BigInt("0"));
    }
    static addErrorMessage(builder, errorMessageOffset) {
      builder.addFieldOffset(12, errorMessageOffset, 0);
    }
    static addIsSimulator(builder, isSimulator2) {
      builder.addFieldInt8(13, +isSimulator2, 0);
    }
    static addTimeScale(builder, timeScale2) {
      builder.addFieldFloat32(14, timeScale2, 1);
    }
    static endState(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createState(builder, programStatus, programNameOffset, kilnTemp, setTemp, envTemp, caseTemp, heatPercent, tempChange, stepOffset, progStartMs, progEndMs, currTimeMs, errorMessageOffset, isSimulator2, timeScale2) {
      _State.startState(builder);
      _State.addProgramStatus(builder, programStatus);
      _State.addProgramName(builder, programNameOffset);
      _State.addKilnTemp(builder, kilnTemp);
      _State.addSetTemp(builder, setTemp);
      _State.addEnvTemp(builder, envTemp);
      _State.addCaseTemp(builder, caseTemp);
      _State.addHeatPercent(builder, heatPercent);
      _State.addTempChange(builder, tempChange);
      _State.addStep(builder, stepOffset);
      _State.addProgStartMs(builder, progStartMs);
      _State.addProgEndMs(builder, progEndMs);
      _State.addCurrTimeMs(builder, currTimeMs);
      _State.addErrorMessage(builder, errorMessageOffset);
      _State.addIsSimulator(builder, isSimulator2);
      _State.addTimeScale(builder, timeScale2);
      return _State.endState(builder);
    }
    unpack() {
      return new StateT(
        this.programStatus(),
        this.programName(),
        this.kilnTemp(),
        this.setTemp(),
        this.envTemp(),
        this.caseTemp(),
        this.heatPercent(),
        this.tempChange(),
        this.step(),
        this.progStartMs(),
        this.progEndMs(),
        this.currTimeMs(),
        this.errorMessage(),
        this.isSimulator(),
        this.timeScale()
      );
    }
    unpackTo(_o) {
      _o.programStatus = this.programStatus();
      _o.programName = this.programName();
      _o.kilnTemp = this.kilnTemp();
      _o.setTemp = this.setTemp();
      _o.envTemp = this.envTemp();
      _o.caseTemp = this.caseTemp();
      _o.heatPercent = this.heatPercent();
      _o.tempChange = this.tempChange();
      _o.step = this.step();
      _o.progStartMs = this.progStartMs();
      _o.progEndMs = this.progEndMs();
      _o.currTimeMs = this.currTimeMs();
      _o.errorMessage = this.errorMessage();
      _o.isSimulator = this.isSimulator();
      _o.timeScale = this.timeScale();
    }
  };
  var StateT = class {
    constructor(programStatus = 0 /* None */, programName = null, kilnTemp = 0, setTemp = 0, envTemp = 0, caseTemp = 0, heatPercent = 0, tempChange = 0, step = null, progStartMs = BigInt("0"), progEndMs = BigInt("0"), currTimeMs = BigInt("0"), errorMessage = null, isSimulator2 = false, timeScale2 = 1) {
      this.programStatus = programStatus;
      this.programName = programName;
      this.kilnTemp = kilnTemp;
      this.setTemp = setTemp;
      this.envTemp = envTemp;
      this.caseTemp = caseTemp;
      this.heatPercent = heatPercent;
      this.tempChange = tempChange;
      this.step = step;
      this.progStartMs = progStartMs;
      this.progEndMs = progEndMs;
      this.currTimeMs = currTimeMs;
      this.errorMessage = errorMessage;
      this.isSimulator = isSimulator2;
      this.timeScale = timeScale2;
    }
    pack(builder) {
      const programName = this.programName !== null ? builder.createString(this.programName) : 0;
      const step = this.step !== null ? builder.createString(this.step) : 0;
      const errorMessage = this.errorMessage !== null ? builder.createString(this.errorMessage) : 0;
      return State.createState(
        builder,
        this.programStatus,
        programName,
        this.kilnTemp,
        this.setTemp,
        this.envTemp,
        this.caseTemp,
        this.heatPercent,
        this.tempChange,
        step,
        this.progStartMs,
        this.progEndMs,
        this.currTimeMs,
        errorMessage,
        this.isSimulator,
        this.timeScale
      );
    }
  };

  // src/generated/furnace/server-message.ts
  var ServerMessage = /* @__PURE__ */ ((ServerMessage2) => {
    ServerMessage2[ServerMessage2["NONE"] = 0] = "NONE";
    ServerMessage2[ServerMessage2["State"] = 1] = "State";
    ServerMessage2[ServerMessage2["Ack"] = 2] = "Ack";
    ServerMessage2[ServerMessage2["HistoryResponse"] = 3] = "HistoryResponse";
    ServerMessage2[ServerMessage2["ProgramListResponse"] = 4] = "ProgramListResponse";
    ServerMessage2[ServerMessage2["ProgramContentResponse"] = 5] = "ProgramContentResponse";
    ServerMessage2[ServerMessage2["PreferencesResponse"] = 6] = "PreferencesResponse";
    ServerMessage2[ServerMessage2["DebugInfoResponse"] = 7] = "DebugInfoResponse";
    ServerMessage2[ServerMessage2["LogListResponse"] = 8] = "LogListResponse";
    ServerMessage2[ServerMessage2["LogContentResponse"] = 9] = "LogContentResponse";
    ServerMessage2[ServerMessage2["Error"] = 10] = "Error";
    return ServerMessage2;
  })(ServerMessage || {});
  function unionToServerMessage(type, accessor) {
    switch (ServerMessage[type]) {
      case "NONE":
        return null;
      case "State":
        return accessor(new State());
      case "Ack":
        return accessor(new Ack());
      case "HistoryResponse":
        return accessor(new HistoryResponse());
      case "ProgramListResponse":
        return accessor(new ProgramListResponse());
      case "ProgramContentResponse":
        return accessor(new ProgramContentResponse());
      case "PreferencesResponse":
        return accessor(new PreferencesResponse());
      case "DebugInfoResponse":
        return accessor(new DebugInfoResponse());
      case "LogListResponse":
        return accessor(new LogListResponse());
      case "LogContentResponse":
        return accessor(new LogContentResponse());
      case "Error":
        return accessor(new Error2());
      default:
        return null;
    }
  }

  // src/generated/furnace/server-envelope.ts
  var ServerEnvelope = class _ServerEnvelope {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsServerEnvelope(bb, obj) {
      return (obj || new _ServerEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsServerEnvelope(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _ServerEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    requestId() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    messageType() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
    }
    message(obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
    }
    static startServerEnvelope(builder) {
      builder.startObject(3);
    }
    static addRequestId(builder, requestId) {
      builder.addFieldInt32(0, requestId, 0);
    }
    static addMessageType(builder, messageType) {
      builder.addFieldInt8(1, messageType, 0 /* NONE */);
    }
    static addMessage(builder, messageOffset) {
      builder.addFieldOffset(2, messageOffset, 0);
    }
    static endServerEnvelope(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static finishServerEnvelopeBuffer(builder, offset) {
      builder.finish(offset);
    }
    static finishSizePrefixedServerEnvelopeBuffer(builder, offset) {
      builder.finish(offset, void 0, true);
    }
    static createServerEnvelope(builder, requestId, messageType, messageOffset) {
      _ServerEnvelope.startServerEnvelope(builder);
      _ServerEnvelope.addRequestId(builder, requestId);
      _ServerEnvelope.addMessageType(builder, messageType);
      _ServerEnvelope.addMessage(builder, messageOffset);
      return _ServerEnvelope.endServerEnvelope(builder);
    }
    unpack() {
      return new ServerEnvelopeT(
        this.requestId(),
        this.messageType(),
        (() => {
          const temp = unionToServerMessage(this.messageType(), this.message.bind(this));
          if (temp === null) {
            return null;
          }
          return temp.unpack();
        })()
      );
    }
    unpackTo(_o) {
      _o.requestId = this.requestId();
      _o.messageType = this.messageType();
      _o.message = (() => {
        const temp = unionToServerMessage(this.messageType(), this.message.bind(this));
        if (temp === null) {
          return null;
        }
        return temp.unpack();
      })();
    }
  };
  var ServerEnvelopeT = class {
    constructor(requestId = 0, messageType = 0 /* NONE */, message = null) {
      this.requestId = requestId;
      this.messageType = messageType;
      this.message = message;
    }
    pack(builder) {
      const message = builder.createObjectOffset(this.message);
      return ServerEnvelope.createServerEnvelope(
        builder,
        this.requestId,
        this.messageType,
        message
      );
    }
  };

  // src/flatbuffers.ts
  var nextRequestId = 1;
  function getNextRequestId() {
    return nextRequestId++;
  }
  var pendingRequests = /* @__PURE__ */ new Map();
  function registerPendingRequest(requestId, callback) {
    pendingRequests.set(requestId, callback);
  }
  function resolvePendingRequest(requestId, response) {
    const callback = pendingRequests.get(requestId);
    if (callback) {
      pendingRequests.delete(requestId);
      callback(response);
      return true;
    }
    return false;
  }
  function createEnvelope(builder, requestId, messageType, messageOffset) {
    const envelope = ClientEnvelope.createClientEnvelope(
      builder,
      requestId,
      messageType,
      messageOffset
    );
    builder.finish(envelope);
    return builder.asUint8Array();
  }
  function encodeStartCommand(segment, minute) {
    const builder = new Builder(64);
    StartCommand.startStartCommand(builder);
    if (segment !== void 0)
      StartCommand.addSegment(builder, segment);
    if (minute !== void 0)
      StartCommand.addMinute(builder, minute);
    const cmd = StartCommand.endStartCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 1 /* StartCommand */, cmd);
  }
  function encodePauseCommand() {
    const builder = new Builder(32);
    PauseCommand.startPauseCommand(builder);
    const cmd = PauseCommand.endPauseCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 2 /* PauseCommand */, cmd);
  }
  function encodeResumeCommand() {
    const builder = new Builder(32);
    ResumeCommand.startResumeCommand(builder);
    const cmd = ResumeCommand.endResumeCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 3 /* ResumeCommand */, cmd);
  }
  function encodeStopCommand() {
    const builder = new Builder(32);
    StopCommand.startStopCommand(builder);
    const cmd = StopCommand.endStopCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 4 /* StopCommand */, cmd);
  }
  function encodeLoadCommand(program) {
    const builder = new Builder(128);
    const programOffset = builder.createString(program);
    LoadCommand.startLoadCommand(builder);
    LoadCommand.addProgram(builder, programOffset);
    const cmd = LoadCommand.endLoadCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 5 /* LoadCommand */, cmd);
  }
  function encodeUnloadCommand() {
    const builder = new Builder(32);
    UnloadCommand.startUnloadCommand(builder);
    const cmd = UnloadCommand.endUnloadCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 6 /* UnloadCommand */, cmd);
  }
  function encodeSetTempCommand(temperature) {
    const builder = new Builder(48);
    SetTempCommand.startSetTempCommand(builder);
    SetTempCommand.addTemperature(builder, temperature);
    const cmd = SetTempCommand.endSetTempCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 7 /* SetTempCommand */, cmd);
  }
  function encodeSetTimeScaleCommand(timeScale2) {
    const builder = new Builder(48);
    SetTimeScaleCommand.startSetTimeScaleCommand(builder);
    SetTimeScaleCommand.addTimeScale(builder, timeScale2);
    const cmd = SetTimeScaleCommand.endSetTimeScaleCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 9 /* SetTimeScaleCommand */, cmd);
  }
  function encodeClearErrorCommand() {
    const builder = new Builder(32);
    ClearErrorCommand.startClearErrorCommand(builder);
    const cmd = ClearErrorCommand.endClearErrorCommand(builder);
    return createEnvelope(builder, getNextRequestId(), 8 /* ClearErrorCommand */, cmd);
  }
  function encodeHistoryRequest(sinceMs, limit) {
    const builder = new Builder(64);
    HistoryRequest.startHistoryRequest(builder);
    if (sinceMs !== void 0)
      HistoryRequest.addSinceMs(builder, BigInt(sinceMs));
    if (limit !== void 0)
      HistoryRequest.addLimit(builder, limit);
    const req = HistoryRequest.endHistoryRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 10 /* HistoryRequest */, req);
  }
  function encodeListProgramsRequest() {
    const builder = new Builder(32);
    ListProgramsRequest.startListProgramsRequest(builder);
    const req = ListProgramsRequest.endListProgramsRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 11 /* ListProgramsRequest */, req);
  }
  function encodeGetProgramRequest(name) {
    const builder = new Builder(128);
    const nameOffset = builder.createString(name);
    GetProgramRequest.startGetProgramRequest(builder);
    GetProgramRequest.addName(builder, nameOffset);
    const req = GetProgramRequest.endGetProgramRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 12 /* GetProgramRequest */, req);
  }
  function encodeSaveProgramRequest(name, content) {
    const builder = new Builder(content.length + 256);
    const nameOffset = builder.createString(name);
    const contentOffset = builder.createString(content);
    SaveProgramRequest.startSaveProgramRequest(builder);
    SaveProgramRequest.addName(builder, nameOffset);
    SaveProgramRequest.addContent(builder, contentOffset);
    const req = SaveProgramRequest.endSaveProgramRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 13 /* SaveProgramRequest */, req);
  }
  function encodeDeleteProgramRequest(name) {
    const builder = new Builder(128);
    const nameOffset = builder.createString(name);
    DeleteProgramRequest.startDeleteProgramRequest(builder);
    DeleteProgramRequest.addName(builder, nameOffset);
    const req = DeleteProgramRequest.endDeleteProgramRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 14 /* DeleteProgramRequest */, req);
  }
  function encodeGetPreferencesRequest() {
    const builder = new Builder(32);
    GetPreferencesRequest.startGetPreferencesRequest(builder);
    const req = GetPreferencesRequest.endGetPreferencesRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 15 /* GetPreferencesRequest */, req);
  }
  function encodeSavePreferencesRequest(json) {
    const builder = new Builder(json.length + 128);
    const jsonOffset = builder.createString(json);
    SavePreferencesRequest.startSavePreferencesRequest(builder);
    SavePreferencesRequest.addJson(builder, jsonOffset);
    const req = SavePreferencesRequest.endSavePreferencesRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 16 /* SavePreferencesRequest */, req);
  }
  function encodeGetDebugInfoRequest() {
    const builder = new Builder(32);
    GetDebugInfoRequest.startGetDebugInfoRequest(builder);
    const req = GetDebugInfoRequest.endGetDebugInfoRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 17 /* GetDebugInfoRequest */, req);
  }
  function encodeListLogsRequest() {
    const builder = new Builder(32);
    ListLogsRequest.startListLogsRequest(builder);
    const req = ListLogsRequest.endListLogsRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 18 /* ListLogsRequest */, req);
  }
  function encodeGetLogRequest(name) {
    const builder = new Builder(128);
    const nameOffset = builder.createString(name);
    GetLogRequest.startGetLogRequest(builder);
    GetLogRequest.addName(builder, nameOffset);
    const req = GetLogRequest.endGetLogRequest(builder);
    return createEnvelope(builder, getNextRequestId(), 19 /* GetLogRequest */, req);
  }
  function decodeState(state2) {
    return {
      type: "state",
      programStatus: state2.programStatus(),
      programName: state2.programName(),
      kilnTemp: state2.kilnTemp(),
      setTemp: state2.setTemp(),
      envTemp: state2.envTemp(),
      caseTemp: state2.caseTemp(),
      heatPercent: state2.heatPercent(),
      tempChange: state2.tempChange(),
      step: state2.step(),
      progStartMs: state2.progStartMs(),
      progEndMs: state2.progEndMs(),
      currTimeMs: state2.currTimeMs(),
      errorMessage: state2.errorMessage(),
      isSimulator: state2.isSimulator(),
      timeScale: state2.timeScale()
    };
  }
  function decodeAck(ack, requestId) {
    return {
      type: "ack",
      requestId,
      success: ack.success(),
      error: ack.error()
    };
  }
  function decodeHistoryResponse(resp, requestId) {
    const data = [];
    const len = resp.dataLength();
    for (let i = 0; i < len; i++) {
      const point = resp.data(i);
      if (point) {
        const decoded = {
          t: Number(point.timestampMs()),
          k: point.kilnTemp(),
          s: point.setTemp(),
          p: point.heatPercent(),
          e: point.envTemp(),
          c: point.caseTemp()
        };
        const markerValue = point.markerValue();
        if (markerValue !== null) {
          decoded.m = {
            type: point.markerType(),
            value: markerValue
          };
        }
        data.push(decoded);
      }
    }
    return {
      type: "history",
      requestId,
      intervalMs: resp.intervalMs(),
      maxAgeMs: resp.maxAgeMs(),
      data
    };
  }
  function decodeProgramListResponse(resp, requestId) {
    const programs = [];
    const len = resp.programsLength();
    for (let i = 0; i < len; i++) {
      const prog = resp.programs(i);
      if (prog) {
        programs.push({
          name: prog.name() || "",
          size: prog.size(),
          description: prog.description() || ""
        });
      }
    }
    return {
      type: "programList",
      requestId,
      programs
    };
  }
  function decodeProgramContentResponse(resp, requestId) {
    return {
      type: "programContent",
      requestId,
      name: resp.name() || "",
      content: resp.content() || ""
    };
  }
  function decodePreferencesResponse(resp, requestId) {
    return {
      type: "preferences",
      requestId,
      json: resp.json() || "{}"
    };
  }
  function decodeDebugInfoResponse(resp, requestId) {
    return {
      type: "debugInfo",
      requestId,
      json: resp.json() || "{}"
    };
  }
  function decodeLogListResponse(resp, requestId) {
    const logs = [];
    const len = resp.logsLength();
    for (let i = 0; i < len; i++) {
      const log2 = resp.logs(i);
      if (log2) {
        logs.push({
          name: log2.name() || "",
          size: log2.size()
        });
      }
    }
    return {
      type: "logList",
      requestId,
      logs
    };
  }
  function decodeLogContentResponse(resp, requestId) {
    return {
      type: "logContent",
      requestId,
      name: resp.name() || "",
      content: resp.content() || ""
    };
  }
  function decodeError(err, requestId) {
    return {
      type: "error",
      requestId,
      code: err.code(),
      message: err.message() || "Unknown error"
    };
  }
  function decodeServerMessage(data) {
    const buf = new ByteBuffer(new Uint8Array(data));
    const envelope = ServerEnvelope.getRootAsServerEnvelope(buf);
    const requestId = envelope.requestId();
    const messageType = envelope.messageType();
    switch (messageType) {
      case 1 /* State */: {
        const state2 = envelope.message(new State());
        if (state2)
          return decodeState(state2);
        break;
      }
      case 2 /* Ack */: {
        const ack = envelope.message(new Ack());
        if (ack)
          return decodeAck(ack, requestId);
        break;
      }
      case 3 /* HistoryResponse */: {
        const resp = envelope.message(new HistoryResponse());
        if (resp)
          return decodeHistoryResponse(resp, requestId);
        break;
      }
      case 4 /* ProgramListResponse */: {
        const resp = envelope.message(new ProgramListResponse());
        if (resp)
          return decodeProgramListResponse(resp, requestId);
        break;
      }
      case 5 /* ProgramContentResponse */: {
        const resp = envelope.message(new ProgramContentResponse());
        if (resp)
          return decodeProgramContentResponse(resp, requestId);
        break;
      }
      case 6 /* PreferencesResponse */: {
        const resp = envelope.message(new PreferencesResponse());
        if (resp)
          return decodePreferencesResponse(resp, requestId);
        break;
      }
      case 7 /* DebugInfoResponse */: {
        const resp = envelope.message(new DebugInfoResponse());
        if (resp)
          return decodeDebugInfoResponse(resp, requestId);
        break;
      }
      case 8 /* LogListResponse */: {
        const resp = envelope.message(new LogListResponse());
        if (resp)
          return decodeLogListResponse(resp, requestId);
        break;
      }
      case 9 /* LogContentResponse */: {
        const resp = envelope.message(new LogContentResponse());
        if (resp)
          return decodeLogContentResponse(resp, requestId);
        break;
      }
      case 10 /* Error */: {
        const err = envelope.message(new Error2());
        if (err)
          return decodeError(err, requestId);
        break;
      }
    }
    return null;
  }
  function sendRequest(ws2, encodedMessage, timeoutMs = 1e4) {
    return new Promise((resolve, reject) => {
      const buf = new ByteBuffer(encodedMessage);
      const envelope = ClientEnvelope.getRootAsClientEnvelope(buf);
      const requestId = envelope.requestId();
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timed out`));
      }, timeoutMs);
      registerPendingRequest(requestId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
      ws2.send(encodedMessage);
    });
  }

  // src/chart/profile.ts
  async function loadProgramProfile(programName) {
    if (!programName || programName === "(manual hold)") {
      setProgramProfile(null);
      updateChartData();
      return;
    }
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("Not connected, cannot load program profile");
        return;
      }
      const resp = await sendRequest(ws, encodeGetProgramRequest(programName));
      const content = resp.content;
      const program = JSON.parse(content);
      const segments = program.segments || [];
      if (!segments.length) {
        setProgramProfile(null);
        updateChartData();
        return;
      }
      const startTemp = state.kiln_temp ?? 0;
      const times = [0];
      const temps = [startTemp];
      let elapsed = 0;
      let currentTemp = startTemp;
      for (const segment of segments) {
        const target = segment.target ?? currentTemp;
        const rampSeconds = timeToSeconds(segment.ramp_time);
        if (rampSeconds > 0) {
          elapsed += rampSeconds;
          times.push(elapsed / 60);
          temps.push(target);
        } else if (target !== currentTemp) {
          times.push(elapsed / 60);
          temps.push(target);
        }
        currentTemp = target;
        const dwellSeconds = timeToSeconds(segment.dwell_time);
        if (dwellSeconds > 0) {
          elapsed += dwellSeconds;
          times.push(elapsed / 60);
          temps.push(target);
        }
      }
      setProgramProfile({
        name: programName,
        startTime: null,
        durationMinutes: elapsed / 60,
        times,
        temps
      });
      console.log("Loaded program profile:", programName, "duration:", elapsed / 60, "min", "points:", times.length);
      updateChartData();
    } catch (err) {
      console.warn("Failed to load program profile:", getErrorMessage(err));
      setProgramProfile(null);
    }
  }
  function buildProfileChartData(targetTimestamps) {
    if (!programProfile || !programProfile.times.length) {
      return new Array(targetTimestamps.length).fill(null);
    }
    let anchorTime;
    if (programProfileLocked && programProfile.startTime) {
      anchorTime = programProfile.startTime;
    } else {
      anchorTime = getNowSeconds();
    }
    const profileTimes = programProfile.times;
    const profileTemps = programProfile.temps;
    const profileTimestamps = profileTimes.map((m) => anchorTime + m * 60);
    const profileStart = profileTimestamps[0];
    const profileEnd = profileTimestamps[profileTimestamps.length - 1];
    return targetTimestamps.map((t) => {
      if (t < profileStart || t > profileEnd)
        return null;
      for (let i = 0; i < profileTimestamps.length - 1; i++) {
        if (t >= profileTimestamps[i] && t <= profileTimestamps[i + 1]) {
          const t0 = profileTimestamps[i];
          const t1 = profileTimestamps[i + 1];
          const v0 = profileTemps[i];
          const v1 = profileTemps[i + 1];
          const pct = (t - t0) / (t1 - t0);
          return v0 + (v1 - v0) * pct;
        }
      }
      return null;
    });
  }
  var lastProgramStatus = 0;
  function handleProgramProfileUpdate() {
    const prevProgramName = programProfile?.name;
    const currentProgramName = state.program_name;
    const currentStatus = state.program_status;
    if (!currentProgramName || currentStatus === 0) {
      setProgramProfile(null);
      setProgramProfileLocked(false);
      lastProgramStatus = currentStatus;
      return;
    }
    const programJustChanged = currentProgramName !== prevProgramName;
    if (programJustChanged) {
      setProgramProfileLocked(false);
      void loadProgramProfile(currentProgramName);
      lastProgramStatus = currentStatus;
      return;
    }
    const profileMatchesProgram = programProfile && programProfile.name === currentProgramName;
    if (!profileMatchesProgram) {
      lastProgramStatus = currentStatus;
      return;
    }
    const wasRunning = lastProgramStatus === 2;
    const isRunning = currentStatus === 2;
    const isReady = currentStatus === 1;
    if (isRunning && !wasRunning && programProfile) {
      const hasBackendStartTime = state.prog_start && state.prog_start !== "-";
      if (hasBackendStartTime) {
        const backendStartTime = new Date(state.prog_start).getTime() / 1e3;
        setProgramProfileLocked(true);
        setProgramProfile({
          name: programProfile.name,
          startTime: backendStartTime,
          durationMinutes: programProfile.durationMinutes,
          times: programProfile.times,
          temps: programProfile.temps
        });
      }
    } else if (isReady && !programProfileLocked) {
      setProgramProfileLocked(false);
    }
    if ((isRunning || [4, 5, 7].includes(currentStatus)) && !programProfileLocked && programProfile) {
      const hasBackendStartTime = state.prog_start && state.prog_start !== "-";
      if (hasBackendStartTime) {
        const backendStartTime = new Date(state.prog_start).getTime() / 1e3;
        setProgramProfileLocked(true);
        setProgramProfile({
          name: programProfile.name,
          startTime: backendStartTime,
          durationMinutes: programProfile.durationMinutes,
          times: programProfile.times,
          temps: programProfile.temps
        });
      }
    }
    lastProgramStatus = currentStatus;
  }

  // src/chart/dashboard.ts
  function getNowSeconds() {
    if (isSimulator && simulatedNow !== null) {
      return simulatedNow / 1e3;
    }
    return Date.now() / 1e3;
  }
  function nowLinePlugin() {
    return {
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            const now = getNowSeconds();
            const xMin = u.scales.x.min;
            const xMax = u.scales.x.max;
            if (now < xMin || now > xMax)
              return;
            const x = u.valToPos(now, "x", true);
            const top = u.bbox.top;
            const bottom = u.bbox.top + u.bbox.height;
            ctx.save();
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.stroke();
            ctx.fillStyle = "#fbbf24";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Now", x, top - 4);
            ctx.restore();
          }
        ]
      }
    };
  }
  function initChart() {
    if (chart || chartInitializing)
      return;
    if (typeof uPlot === "undefined") {
      console.warn("uPlot not loaded");
      return;
    }
    const container = document.getElementById("chartContainer");
    if (!container) {
      console.warn("Chart container not found");
      return;
    }
    const dashboardView = document.getElementById("view-dashboard");
    if (!dashboardView || !dashboardView.classList.contains("active")) {
      return;
    }
    if (!container.offsetParent && window.getComputedStyle(container).display === "none") {
      return;
    }
    const width = container.clientWidth || 400;
    if (width < 100)
      return;
    setChartInitializing(true);
    const now = getNowSeconds();
    const data = [
      [now - 60, now],
      [25, 25],
      [0, 0],
      [22, 22],
      [28, 28],
      [null, null]
    ];
    const opts = {
      width,
      height: 300,
      plugins: [nowLinePlugin()],
      scales: {
        x: { time: true },
        y: { auto: true }
      },
      series: [
        {},
        { label: "Kiln", stroke: "#ff6b4a", width: 2, points: { show: false } },
        { label: "Target", stroke: "#4ade80", width: 2, points: { show: false } },
        { label: "Env", stroke: "#888888", width: 1, points: { show: false } },
        { label: "Case", stroke: "#666666", width: 1, points: { show: false } },
        { label: "Program", stroke: "#22d3ee", width: 2, dash: [5, 5], points: { show: false } }
      ],
      axes: [
        {
          stroke: "#888",
          grid: { stroke: "#2d2d3a", width: 1 },
          ticks: { stroke: "#2d2d3a" },
          values: (_, vals) => vals.map((v) => formatTimeLabel(v)),
          font: "11px Inter, sans-serif"
        },
        {
          stroke: "#888",
          grid: { stroke: "#2d2d3a", width: 1 },
          ticks: { stroke: "#2d2d3a" },
          values: (_, vals) => vals.map((v) => `${Math.round(v)}\xB0C`),
          font: "11px Inter, sans-serif",
          size: 50
        }
      ],
      legend: { show: false },
      cursor: { show: true, drag: { x: true, y: false } },
      hooks: {
        setScale: [
          (_u, key) => {
            if (key === "x")
              updateOverviewBar();
          }
        ],
        ready: [
          (u) => {
            u.root.addEventListener("mousedown", (e) => {
              const target = e.target;
              if (target.tagName === "CANVAS") {
                setAutoScrollEnabled(false);
                updateAutoScrollButton();
              }
            });
          }
        ]
      }
    };
    window.setTimeout(() => {
      try {
        const el = document.getElementById("chartContainer");
        if (!el) {
          console.warn("Chart container not found");
          setChartInitializing(false);
          return;
        }
        el.innerHTML = "";
        setChart(new uPlot(opts, data, el));
        setChartInitializing(false);
        console.log("Chart initialized successfully");
        createChartLegend();
        setDefaultView();
        const resizeObserver = new ResizeObserver(() => {
          if (chart && el.clientWidth > 0) {
            chart.setSize({ width: el.clientWidth, height: 300 });
          }
        });
        resizeObserver.observe(el);
        el.addEventListener("wheel", (e) => {
          if (!chart)
            return;
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const cursorX = e.clientX - rect.left;
          const cursorPct = cursorX / el.clientWidth;
          const xMin = chart.scales.x.min;
          const xMax = chart.scales.x.max;
          const xRange = xMax - xMin;
          const factor = e.deltaY > 0 ? 1.2 : 0.8;
          let newRange = xRange * factor;
          newRange = Math.max(CHART_MIN_WINDOW, newRange);
          const maxRange = getChartMaxRange();
          newRange = Math.min(maxRange, newRange);
          const cursorTime = xMin + xRange * cursorPct;
          const newMin = cursorTime - newRange * cursorPct;
          const newMax = cursorTime + newRange * (1 - cursorPct);
          chart.setScale("x", { min: newMin, max: newMax });
        }, { passive: false });
        setupTouchHandlers(el);
        setupOverviewBar();
        updateOverviewBar();
      } catch (e) {
        console.error("Failed to initialize chart:", e);
        setChart(null);
        setChartInitializing(false);
      }
    }, 100);
  }
  function setupTouchHandlers(el) {
    let touchStartX = null;
    let touchStartScale = null;
    let initialPinchDistance = null;
    el.addEventListener("touchstart", (e) => {
      if (!chart)
        return;
      if (e.touches.length === 1) {
        setAutoScrollEnabled(false);
        updateAutoScrollButton();
        touchStartX = e.touches[0].clientX;
        touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
      } else if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
      }
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (!chart || !touchStartScale)
        return;
      if (e.touches.length === 1 && touchStartX !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const pxPerSec = el.clientWidth / (touchStartScale.max - touchStartScale.min);
        const dt = dx / pxPerSec;
        chart.setScale("x", { min: touchStartScale.min - dt, max: touchStartScale.max - dt });
      } else if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = initialPinchDistance / currentDistance;
        const range = (touchStartScale.max - touchStartScale.min) * scale;
        const center = (touchStartScale.min + touchStartScale.max) / 2;
        const clampedRange = Math.max(CHART_MIN_WINDOW, Math.min(getChartMaxRange(), range));
        chart.setScale("x", { min: center - clampedRange / 2, max: center + clampedRange / 2 });
      }
    }, { passive: false });
    el.addEventListener("touchend", () => {
      touchStartX = null;
      touchStartScale = null;
      initialPinchDistance = null;
    }, { passive: true });
  }
  async function loadChartHistory() {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("Not connected, cannot load history");
        return;
      }
      const resp = await sendRequest(ws, encodeHistoryRequest());
      if (!resp.data || !resp.data.length) {
        console.log("No history data available");
        return;
      }
      chartData.timestamps = [];
      chartData.kilnTemps = [];
      chartData.setTemps = [];
      chartData.envTemps = [];
      chartData.caseTemps = [];
      chartData.markers = [];
      for (const point of resp.data) {
        if (point.t && point.k !== void 0 && point.s !== void 0) {
          chartData.timestamps.push(point.t / 1e3);
          chartData.kilnTemps.push(point.k);
          chartData.setTemps.push(point.s);
          chartData.envTemps.push(point.e !== void 0 ? point.e : 22);
          chartData.caseTemps.push(point.c !== void 0 ? point.c : 28);
          if (point.m) {
            chartData.markers.push({
              x: point.t / 1e3,
              type: String(point.m.type),
              value: point.m.value ?? void 0
            });
          }
        }
      }
      console.log("Loaded", chartData.timestamps.length, "history points");
      if (chart) {
        updateChartData();
        if (autoScrollEnabled) {
          setDefaultView();
        }
      }
    } catch (err) {
      console.warn("Failed to load chart history:", getErrorMessage(err));
    }
  }
  function addChartPoint(kilnTemp, setTemp, envTemp, caseTemp) {
    if (kilnTemp === void 0 || setTemp === void 0 || Number.isNaN(kilnTemp) || Number.isNaN(setTemp)) {
      return;
    }
    const now = getNowSeconds();
    chartData.timestamps.push(now);
    chartData.kilnTemps.push(Number(kilnTemp));
    chartData.setTemps.push(Number(setTemp));
    chartData.envTemps.push(Number(envTemp ?? 22));
    chartData.caseTemps.push(Number(caseTemp ?? 28));
    while (chartData.timestamps.length > CHART_MAX_POINTS) {
      chartData.timestamps.shift();
      chartData.kilnTemps.shift();
      chartData.setTemps.shift();
      chartData.envTemps.shift();
      chartData.caseTemps.shift();
    }
    updateChartData();
  }
  function updateChartData() {
    if (!chart)
      return;
    const len = chartData.timestamps.length;
    if (len === 0)
      return;
    while (chartData.envTemps.length < len)
      chartData.envTemps.push(22);
    while (chartData.caseTemps.length < len)
      chartData.caseTemps.push(28);
    const now = getNowSeconds();
    let timestamps = [...chartData.timestamps];
    let kilnTemps = [...chartData.kilnTemps];
    let setTemps = [...chartData.setTemps];
    let envTemps = [...chartData.envTemps];
    let caseTemps = [...chartData.caseTemps];
    if (programProfile && programProfile.durationMinutes > 0) {
      const anchorTime = programProfileLocked && programProfile.startTime ? programProfile.startTime : now;
      const profileEnd = anchorTime + programProfile.durationMinutes * 60;
      const lastTimestamp = timestamps[timestamps.length - 1] || now;
      if (profileEnd > lastTimestamp) {
        for (let t = lastTimestamp + 60; t <= profileEnd; t += 60) {
          timestamps.push(t);
          kilnTemps.push(null);
          setTemps.push(null);
          envTemps.push(null);
          caseTemps.push(null);
        }
      }
    }
    const profileTemps = buildProfileChartData(timestamps);
    const currentMin = chart.scales.x.min;
    const currentMax = chart.scales.x.max;
    const currentRange = currentMax - currentMin;
    chart.setData([
      timestamps,
      kilnTemps,
      setTemps,
      envTemps,
      caseTemps,
      profileTemps
    ], false);
    if (autoScrollEnabled) {
      const nowSec = getNowSeconds();
      const newMin = nowSec - currentRange * 0.67;
      const newMax = nowSec + currentRange * 0.33;
      chart.setScale("x", { min: newMin, max: newMax });
    } else {
      chart.setScale("x", { min: currentMin, max: currentMax });
    }
    updateOverviewBar();
  }
  function getChartMaxRange() {
    const now = getNowSeconds();
    const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    return rightEdge - oldest;
  }
  function getProgramEndTime() {
    if (!programProfile)
      return getNowSeconds();
    const startTime = programProfile.startTime || getNowSeconds();
    return startTime + programProfile.durationMinutes * 60;
  }
  function resetZoom() {
    if (!chart)
      return;
    const currentCenter = (chart.scales.x.min + chart.scales.x.max) / 2;
    const windowSize = 60 * 60;
    const min = currentCenter - windowSize / 2;
    const max = currentCenter + windowSize / 2;
    chart.setScale("x", { min, max });
  }
  function setDefaultView() {
    if (!chart)
      return;
    const now = getNowSeconds();
    const windowSize = 60 * 60;
    const min = now - windowSize * 0.67;
    const max = now + windowSize * 0.33;
    chart.setScale("x", { min, max });
  }
  function toggleAutoScroll() {
    if (!chart)
      return;
    setAutoScrollEnabled(!autoScrollEnabled);
    updateAutoScrollButton();
    if (autoScrollEnabled) {
      const currentRange = chart.scales.x.max - chart.scales.x.min;
      const now = getNowSeconds();
      const min = now - currentRange * 0.67;
      const max = now + currentRange * 0.33;
      chart.setScale("x", { min, max });
    }
  }
  function updateAutoScrollButton() {
    const btn = document.getElementById("autoScrollBtn");
    if (!btn)
      return;
    btn.textContent = autoScrollEnabled ? "\u23F8 Auto Scroll" : "\u25B6 Auto Scroll";
  }
  function centerOnProgram() {
    setDefaultView();
  }
  function createChartLegend() {
    const legendEl = document.getElementById("chartLegend");
    if (!legendEl || !chart)
      return;
    const series = [
      { label: "Kiln", color: "#ff6b4a" },
      { label: "Target", color: "#4ade80" },
      { label: "Env", color: "#888888" },
      { label: "Case", color: "#666666" },
      { label: "Program", color: "#22d3ee", dashed: true }
    ];
    legendEl.innerHTML = series.map((s, i) => {
      const idx = i + 1;
      const dashStyle = s.dashed ? `border-top: 2px dashed ${s.color}` : `background: ${s.color}`;
      return `<div class="chart-legend-item" data-series="${idx}" style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
          <span style="width: 16px; height: 3px; ${dashStyle};"></span>
          <span style="color: var(--text);">${s.label}</span>
        </div>`;
    }).join("");
    legendEl.querySelectorAll(".chart-legend-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (!chart)
          return;
        const idx = parseInt(item.dataset.series || "0", 10);
        const isVisible = chart.series[idx]?.show;
        chart.setSeries(idx, { show: !isVisible });
        item.style.opacity = isVisible ? "0.4" : "1";
      });
    });
  }
  function setupOverviewBar() {
    const overview = document.getElementById("chartOverview");
    if (!overview)
      return;
    const viewport = document.createElement("div");
    viewport.className = "overview-viewport";
    overview.appendChild(viewport);
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    viewport.addEventListener("mousedown", (e) => {
      dragging = true;
      setAutoScrollEnabled(false);
      updateAutoScrollButton();
      startX = e.clientX;
      startLeft = parseFloat(viewport.style.left || "0");
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging || !chart)
        return;
      const dx = e.clientX - startX;
      const overviewWidth = overview.clientWidth;
      const dPct = dx / overviewWidth * 100;
      const now = getNowSeconds();
      const oldest = chartData.timestamps[0] || now - 3600;
      const programEnd = getProgramEndTime();
      const rightEdge = Math.max(now + 6 * 3600, programEnd);
      const fullRange = rightEdge - oldest;
      const viewRange = chart.scales.x.max - chart.scales.x.min;
      const newLeftPct = Math.max(0, Math.min(100 - viewRange / fullRange * 100, startLeft + dPct));
      const newMin = oldest + newLeftPct / 100 * fullRange;
      const newMax = newMin + viewRange;
      chart.setScale("x", { min: newMin, max: newMax });
    });
    document.addEventListener("mouseup", () => {
      dragging = false;
    });
    overview.addEventListener("click", (e) => {
      if (!chart)
        return;
      const target = e.target;
      if (target.classList.contains("overview-viewport"))
        return;
      setAutoScrollEnabled(false);
      updateAutoScrollButton();
      const rect = overview.getBoundingClientRect();
      const clickPct = (e.clientX - rect.left) / rect.width;
      const now = getNowSeconds();
      const oldest = chartData.timestamps[0] || now - 3600;
      const programEnd = getProgramEndTime();
      const rightEdge = Math.max(now + 6 * 3600, programEnd);
      const fullRange = rightEdge - oldest;
      const viewRange = chart.scales.x.max - chart.scales.x.min;
      const centerTime = oldest + clickPct * fullRange;
      const newMin = centerTime - viewRange / 2;
      const newMax = centerTime + viewRange / 2;
      chart.setScale("x", { min: newMin, max: newMax });
    });
  }
  function updateOverviewBar() {
    const overview = document.getElementById("chartOverview");
    if (!overview || !chart)
      return;
    const viewport = overview.querySelector(".overview-viewport");
    if (!viewport)
      return;
    const now = getNowSeconds();
    const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;
    const viewMin = chart.scales.x.min;
    const viewMax = chart.scales.x.max;
    const leftPct = (viewMin - oldest) / fullRange * 100;
    const widthPct = (viewMax - viewMin) / fullRange * 100;
    viewport.style.left = `${Math.max(0, leftPct)}%`;
    viewport.style.width = `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`;
  }

  // src/types/state.ts
  var STATUS_NAMES = {
    0: "NONE",
    1: "READY",
    2: "RUNNING",
    3: "PAUSED",
    4: "STOPPED",
    5: "ERROR",
    6: "WAITING",
    7: "FINISHED"
  };
  var STATUS_CLASSES = {
    2: "running",
    3: "paused",
    5: "error"
  };

  // src/ui/statusbar.ts
  function updateUI() {
    const s = state;
    const statusKiln = document.getElementById("statusKiln");
    const statusTarget = document.getElementById("statusTarget");
    const statusEnv = document.getElementById("statusEnv");
    const statusHeat = document.getElementById("statusHeat");
    if (statusKiln)
      statusKiln.textContent = formatTemp(s.kiln_temp);
    if (statusTarget)
      statusTarget.textContent = formatTemp(s.set_temp);
    if (statusEnv)
      statusEnv.textContent = formatTemp(s.env_temp);
    if (statusHeat)
      statusHeat.textContent = `${s.heat_percent || 0}%`;
    const badge = document.getElementById("statusBadge");
    if (badge) {
      badge.textContent = STATUS_NAMES[s.program_status] || "UNKNOWN";
      badge.className = "program-status " + (STATUS_CLASSES[s.program_status] || "");
    }
    const dashKiln = document.getElementById("dashKiln");
    const dashTarget = document.getElementById("dashTarget");
    const dashEnv = document.getElementById("dashEnv");
    const dashCase = document.getElementById("dashCase");
    const dashStatus = document.getElementById("dashStatus");
    const dashProgram = document.getElementById("dashProgram");
    const dashStep = document.getElementById("dashStep");
    const dashHeat = document.getElementById("dashHeat");
    const dashStart = document.getElementById("dashStart");
    const dashEnd = document.getElementById("dashEnd");
    const dashTime = document.getElementById("dashTime");
    const dashChange = document.getElementById("dashChange");
    if (dashKiln)
      dashKiln.textContent = formatTemp(s.kiln_temp);
    if (dashTarget)
      dashTarget.textContent = formatTemp(s.set_temp);
    if (dashEnv)
      dashEnv.textContent = formatTemp(s.env_temp);
    if (dashCase)
      dashCase.textContent = formatTemp(s.case_temp);
    if (dashStatus)
      dashStatus.textContent = STATUS_NAMES[s.program_status] || "--";
    if (dashProgram)
      dashProgram.textContent = s.program_name || "--";
    if (dashStep)
      dashStep.textContent = s.step || "--";
    if (dashHeat)
      dashHeat.textContent = `${s.heat_percent || 0}%`;
    if (dashStart)
      dashStart.textContent = s.prog_start || "--";
    if (dashEnd)
      dashEnd.textContent = s.prog_end || "--";
    if (dashTime)
      dashTime.textContent = s.curr_time || "--";
    if (dashChange)
      dashChange.textContent = `${(s.temp_change || 0).toFixed(1)}\xB0C/h`;
    updateLoadControls(s.program_status);
    updateStartButton(s.program_status);
  }
  function updateLoadControls(status) {
    const running = status === 2;
    setIsProgramRunning(running);
    const select = document.getElementById("programSelect");
    if (select)
      select.disabled = running;
    const sidebarBtn = document.getElementById("sidebarLoadBtn");
    if (sidebarBtn)
      sidebarBtn.disabled = running;
    const clearBtn = document.getElementById("sidebarClearBtn");
    if (clearBtn)
      clearBtn.disabled = running;
    applyProgramLoadButtons();
  }
  function applyProgramLoadButtons() {
    document.querySelectorAll(".program-load-btn").forEach((btn) => {
      btn.disabled = isProgramRunning;
      btn.classList.toggle("primary", !isProgramRunning);
      btn.classList.toggle("running-disabled", isProgramRunning);
    });
  }
  function updateStartButton(status) {
    const btn = document.getElementById("startBtn");
    const running = status === 2;
    if (!btn)
      return;
    btn.disabled = running;
    btn.classList.toggle("primary", !running);
    btn.classList.toggle("running-disabled", running);
  }

  // src/chart/preview.ts
  async function fetchProgramContent(name) {
    if (previewCache.has(name)) {
      return previewCache.get(name);
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected");
    }
    const resp = await sendRequest(ws, encodeGetProgramRequest(name));
    previewCache.set(name, resp.content);
    return resp.content;
  }
  function buildProgramPreviewData(content) {
    try {
      const program = JSON.parse(content);
      const segments = Array.isArray(program.segments) ? program.segments : [];
      if (!segments.length)
        return null;
      const minutes = [0];
      const temps = [segments[0].target ?? 0];
      let elapsed = 0;
      let currentTemp = temps[0];
      for (const segment of segments) {
        const target = typeof segment.target === "number" ? segment.target : currentTemp;
        const rampSeconds = timeToSeconds(segment.ramp_time);
        if (rampSeconds > 0) {
          elapsed += rampSeconds;
          minutes.push(elapsed / 60);
          temps.push(target);
        } else if (target !== currentTemp) {
          minutes.push(elapsed / 60);
          temps.push(target);
        }
        currentTemp = target;
        const dwellSeconds = timeToSeconds(segment.dwell_time);
        if (dwellSeconds > 0) {
          elapsed += dwellSeconds;
          minutes.push(elapsed / 60);
          temps.push(target);
        }
      }
      return [minutes, temps];
    } catch {
      return null;
    }
  }
  async function showProgramPreview(name, container) {
    if (!container)
      return;
    container.innerHTML = '<div class="preview-loading">Loading preview\u2026</div>';
    const width = container.clientWidth || 320;
    try {
      const content = await fetchProgramContent(name);
      const data = buildProgramPreviewData(content);
      if (!data) {
        container.innerHTML = '<div class="preview-error">Unable to render preview</div>';
        return;
      }
      container.innerHTML = "";
      const baseMs = Date.now();
      const opts = {
        width,
        height: 160,
        scales: {
          x: { time: false },
          y: { auto: true }
        },
        axes: [
          {
            stroke: "#888",
            grid: { stroke: "#2d2d3a", width: 1 },
            ticks: { stroke: "#2d2d3a" },
            values: (_, vals) => vals.map((v) => formatPreviewTimeLabel(baseMs, v)),
            label: "Time (hh:mm)"
          },
          {
            stroke: "#888",
            grid: { stroke: "#2d2d3a", width: 1 },
            ticks: { stroke: "#2d2d3a" },
            values: (_, vals) => vals.map((v) => `${Math.round(v)}\xB0C`),
            label: "Temperature (\xB0C)"
          }
        ],
        series: [
          {},
          {
            label: "Target",
            stroke: "#4ade80",
            width: 2,
            points: { show: false }
          }
        ],
        cursor: { show: false }
      };
      const existingChart = previewCharts.get(name);
      if (existingChart) {
        existingChart.destroy();
      }
      const chartInstance = new uPlot(opts, data, container);
      previewCharts.set(name, chartInstance);
    } catch (err) {
      container.innerHTML = `<div class="preview-error">${getErrorMessage(err)}</div>`;
    }
  }
  async function togglePreview(button) {
    if (!button)
      return;
    const name = button.dataset.program;
    if (!name)
      return;
    const selector = `tr[data-preview="${cssEscape(name)}"]`;
    const row = document.querySelector(selector);
    if (!row)
      return;
    const descRow = document.querySelector(`tr[data-description="${cssEscape(name)}"]`);
    const isOpen = row.dataset.open === "true";
    if (isOpen) {
      row.dataset.open = "false";
      row.style.display = "none";
      if (descRow) {
        descRow.style.display = "none";
      }
      updatePreviewButtonLabels(name, false);
      return;
    }
    row.dataset.open = "true";
    row.style.display = "table-row";
    if (descRow) {
      descRow.style.display = "table-row";
    }
    updatePreviewButtonLabels(name, true);
    const container = row.querySelector(".program-preview-chart");
    await showProgramPreview(name, container || void 0);
  }
  function updatePreviewButtonLabels(name, open) {
    document.querySelectorAll(`button[data-program="${cssEscape(name)}"]`).forEach((btn) => {
      const action = btn.dataset.previewAction;
      if (action === "toggle") {
        btn.textContent = open ? "Hide Preview" : "Preview";
      } else if (action === "close") {
        btn.textContent = "Close";
      }
    });
  }

  // src/views/programs.ts
  async function loadProgramSelect() {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const resp = await sendRequest(ws, encodeListProgramsRequest());
      const select = document.getElementById("programSelect");
      if (!select)
        return;
      select.innerHTML = '<option value="">Load program...</option>';
      resp.programs.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.name;
        opt.textContent = f.name;
        select.appendChild(opt);
      });
    } catch (err) {
      console.warn("Failed to load programs:", getErrorMessage(err));
    }
  }
  async function loadProgramList() {
    const tbody = document.getElementById("programsTableBody");
    if (!tbody)
      return;
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted)">Not connected</td></tr>';
        return;
      }
      const resp = await sendRequest(ws, encodeListProgramsRequest());
      const disableAttr = isProgramRunning ? " disabled" : "";
      tbody.innerHTML = resp.programs.map((f) => {
        const attrName = escapeAttr(f.name);
        const jsName = escapeJs(f.name);
        const description = escapeHtml(f.description || "No description provided.");
        return `
            <tr>
              <td>${escapeHtml(f.name)}</td>
              <td>${f.size} B</td>
              <td class="actions">
                <button class="btn-small primary program-load-btn"${disableAttr} onclick="sendCommand('load', {program:'${jsName}'})">Load</button>
                <button class="btn-small" onclick="editProgram('${jsName}')">Edit</button>
                <button class="btn-small danger" onclick="deleteProgram('${jsName}')">Delete</button>
                <button class="btn-small" data-program="${attrName}" data-preview-action="toggle" onclick="togglePreview(this)">Preview</button>
              </td>
            </tr>
            <tr class="program-description-row" data-description="${attrName}">
              <td colspan="3">
                <div class="program-description">${description}</div>
              </td>
            </tr>
            <tr class="program-preview-row" data-preview="${attrName}">
              <td colspan="3">
                <div class="program-preview">
                  <div class="program-preview-header">
                    <span>Program Preview</span>
                    <button class="btn-small" data-program="${attrName}" data-preview-action="close" onclick="togglePreview(this)">Close</button>
                  </div>
                  <div class="program-preview-chart" id="preview-chart-${attrName}"></div>
                </div>
              </td>
            </tr>
          `;
      }).join("");
      applyProgramLoadButtons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  function createProgram() {
    const name = window.prompt("Program name (e.g., my_program.json):");
    if (!name)
      return;
    void editProgram(name, true);
  }
  async function editProgram(name, isNew = false) {
    setEditorState({ filename: name, isNew });
    const textarea = document.getElementById("editorContent");
    const filenameEl = document.getElementById("editorFilename");
    if (!textarea || !filenameEl)
      return;
    filenameEl.textContent = isNew ? `New: ${name}` : name;
    if (isNew) {
      textarea.value = '{\n  "description": "Program description",\n  "segments": [\n    {\n      "target": 500,\n      "ramp_time": { "hours": 1, "minutes": 0, "seconds": 0 },\n      "dwell_time": { "hours": 0, "minutes": 30, "seconds": 0 }\n    }\n  ]\n}';
    } else {
      try {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          window.alert("Not connected");
          return;
        }
        const resp = await sendRequest(ws, encodeGetProgramRequest(name));
        textarea.value = resp.content;
      } catch (err) {
        window.alert("Error loading program: " + getErrorMessage(err));
        return;
      }
    }
    updateEditorStatus();
    window.location.hash = "#/editor";
    textarea.focus();
  }
  function validateProgramJson(content) {
    try {
      const program = JSON.parse(content);
      if (typeof program !== "object" || program === null) {
        return { valid: false, error: "Program must be a JSON object" };
      }
      if (!Array.isArray(program.segments)) {
        return { valid: false, error: 'Program must have a "segments" array' };
      }
      if (program.segments.length === 0) {
        return { valid: false, error: "Program must have at least one segment" };
      }
      for (let i = 0; i < program.segments.length; i++) {
        const seg = program.segments[i];
        const segNum = i + 1;
        if (typeof seg.target !== "number") {
          return { valid: false, error: `Segment ${segNum}: "target" must be a number` };
        }
        if (!seg.ramp_time || typeof seg.ramp_time !== "object") {
          return { valid: false, error: `Segment ${segNum}: "ramp_time" must be an object` };
        }
        if (!seg.dwell_time || typeof seg.dwell_time !== "object") {
          return { valid: false, error: `Segment ${segNum}: "dwell_time" must be an object` };
        }
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}` };
    }
  }
  async function saveProgram() {
    const textarea = document.getElementById("editorContent");
    if (!textarea)
      return;
    const content = textarea.value;
    const name = editorState.filename;
    if (!name) {
      window.alert("No filename set");
      return;
    }
    if (content.length > 10240) {
      window.alert("File too large (max 10KB)");
      return;
    }
    const validation = validateProgramJson(content);
    if (!validation.valid) {
      window.alert(`Invalid program: ${validation.error}`);
      return;
    }
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        window.alert("Not connected");
        return;
      }
      await sendRequest(ws, encodeSaveProgramRequest(name, content));
      previewCache.delete(name);
      void loadProgramSelect();
      window.location.hash = "#/programs";
    } catch (err) {
      window.alert("Error saving: " + getErrorMessage(err));
    }
  }
  function cancelEdit() {
    const textarea = document.getElementById("editorContent");
    const content = textarea ? textarea.value : "";
    if (content && !window.confirm("Discard changes?"))
      return;
    window.location.hash = "#/programs";
  }
  function updateEditorStatus() {
    const textarea = document.getElementById("editorContent");
    if (!textarea)
      return;
    const content = textarea.value;
    const lines = content.split("\n");
    const lineCount = document.getElementById("editorLineCount");
    const byteCount = document.getElementById("editorByteCount");
    if (lineCount)
      lineCount.textContent = `${lines.length} lines`;
    if (byteCount)
      byteCount.textContent = `${new Blob([content]).size} bytes`;
    const lineNumbers = document.getElementById("editorLines");
    if (lineNumbers) {
      lineNumbers.textContent = lines.map((_, i) => i + 1).join("\n");
    }
  }
  async function deleteProgram(name) {
    if (!window.confirm(`Delete program "${name}"?`))
      return;
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        window.alert("Not connected");
        return;
      }
      await sendRequest(ws, encodeDeleteProgramRequest(name));
      previewCache.delete(name);
      void loadProgramList();
      void loadProgramSelect();
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }
  function initEditorListeners() {
    const textarea = document.getElementById("editorContent");
    if (textarea) {
      textarea.addEventListener("input", updateEditorStatus);
      textarea.addEventListener("scroll", () => {
        const lines = document.getElementById("editorLines");
        if (lines) {
          lines.scrollTop = textarea.scrollTop;
        }
      });
    }
  }

  // src/views/logs.ts
  async function loadLogsList() {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody)
      return;
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">Not connected</td></tr>';
        return;
      }
      const resp = await sendRequest(ws, encodeListLogsRequest());
      if (!resp.logs.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">No logs yet</td></tr>';
        return;
      }
      tbody.innerHTML = resp.logs.map((f) => `
          <tr>
            <td>${escapeHtml(f.name)}</td>
            <td>${f.size} B</td>
            <td class="actions">
              <button class="btn-small" onclick="viewLog('${escapeJs(f.name)}')">View</button>
              <button class="btn-small" onclick="downloadLog('${escapeJs(f.name)}')">Download</button>
            </td>
          </tr>
        `).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  async function viewLog(name) {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        window.alert("Not connected");
        return;
      }
      const resp = await sendRequest(ws, encodeGetLogRequest(name));
      window.alert(resp.content.slice(0, 2e3) + (resp.content.length > 2e3 ? "\n...(truncated)" : ""));
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }
  function downloadLog(name) {
    window.open(`/logs/${encodeURIComponent(name)}`, "_blank");
  }

  // src/views/preferences.ts
  async function loadPreferences() {
    const container = document.getElementById("prefsContent");
    if (!container)
      return;
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        container.innerHTML = '<p style="color:var(--text-muted)">Not connected</p>';
        return;
      }
      const resp = await sendRequest(ws, encodeGetPreferencesRequest());
      setPreferences(JSON.parse(resp.json));
      const sections = {
        WiFi: ["WiFi_SSID", "WiFi_Password", "WiFi_Mode", "WiFi_Retry_cnt"],
        "HTTP Server": ["Auth_Username", "Auth_Password", "HTTP_Local_JS"],
        Time: ["NTP_Server1", "NTP_Server2", "NTP_Server3", "GMT_Offset_sec", "Daylight_Offset_sec"],
        PID: ["PID_Window", "PID_Kp", "PID_Ki", "PID_Kd", "PID_POE", "PID_Temp_Threshold"],
        Logging: ["LOG_Window", "LOG_Files_Limit"],
        Safety: ["MIN_Temperature", "MAX_Temperature", "MAX_Housing_Temperature", "Thermal_Runaway", "Alarm_Timeout", "MAX31855_Error_Grace_Count"],
        Debug: ["DBG_Serial", "DBG_Syslog", "DBG_Syslog_Srv", "DBG_Syslog_Port"]
      };
      let html = "";
      for (const [section, keys] of Object.entries(sections)) {
        html += `<div class="prefs-section"><div class="prefs-section-header">${section}</div><div class="prefs-section-content">`;
        for (const key of keys) {
          if (preferences[key] !== void 0) {
            const type = key.includes("Password") ? "password" : "text";
            html += `<div class="pref-row">
                <label class="pref-label">${key}</label>
                <div class="pref-input"><input type="${type}" id="pref_${key}" value="${escapeHtml(String(preferences[key]))}"></div>
              </div>`;
          }
        }
        html += "</div></div>";
      }
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p style="color:var(--error)">${getErrorMessage(err)}</p>`;
    }
  }
  async function savePreferences() {
    const data = {};
    document.querySelectorAll('[id^="pref_"]').forEach((el) => {
      const key = el.id.replace("pref_", "");
      data[key] = el.value;
    });
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        window.alert("Not connected");
        return;
      }
      await sendRequest(ws, encodeSavePreferencesRequest(JSON.stringify(data)));
      window.alert("Preferences saved!");
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }

  // src/views/debug.ts
  async function loadDebugInfo() {
    const table = document.getElementById("debugTable");
    if (!table)
      return;
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        table.innerHTML = '<tr><td colspan="2" style="color:var(--text-muted)">Not connected</td></tr>';
        return;
      }
      const resp = await sendRequest(ws, encodeGetDebugInfoRequest());
      const data = JSON.parse(resp.json);
      const sections = {
        "Chip Information": ["CHIP_ID", "CHIP_REV", "CHIP_MODEL", "CHIP_CORES", "CPU_FREQ", "SDK_VERSION", "MAC_ADDRESS"],
        Flash: ["SFLASH_RAM", "FLASH_FREQ", "FLASH_MODE", "SKETCH_SIZE", "SKETCH_TOTAL"],
        PSRAM: ["TOTAL_PSRAM", "FREE_PSRAM", "SMALEST_PSRAM", "LARGEST_PSRAM"],
        Heap: ["TOTAL_HEAP", "FREE_HEAP", "SMALEST_HEAP", "LARGEST_HEAP"],
        Filesystem: ["TOTAL_KB", "USED_KB"]
      };
      let html = "";
      for (const [section, keys] of Object.entries(sections)) {
        html += `<tr><th colspan="2">${section}</th></tr>`;
        for (const key of keys) {
          if (data[key] !== void 0) {
            html += `<tr><td>${key}</td><td>${escapeHtml(String(data[key]))}</td></tr>`;
          }
        }
      }
      table.innerHTML = html;
    } catch (err) {
      table.innerHTML = `<tr><td colspan="2" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  function log(type, message) {
    if (!wsLogEnabled)
      return;
    const container = document.getElementById("logContent");
    if (!container)
      return;
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour12: false });
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-type ${type}">${type.toUpperCase()}</span>
        <span class="log-message">${escapeHtml(message)}</span>
      `;
    container.insertBefore(entry, container.firstChild);
    while (container.children.length > 200)
      container.removeChild(container.lastChild);
  }
  function toggleWsLog() {
    const checkbox = document.getElementById("wsLogEnabled");
    const container = document.getElementById("wsLogContainer");
    if (!checkbox || !container)
      return;
    setWsLogEnabled(checkbox.checked);
    container.style.display = wsLogEnabled ? "flex" : "none";
    window.localStorage.setItem("wsLogEnabled", String(wsLogEnabled));
  }
  function initWsLogState() {
    setWsLogEnabled(window.localStorage.getItem("wsLogEnabled") === "true");
    const checkbox = document.getElementById("wsLogEnabled");
    const container = document.getElementById("wsLogContainer");
    if (checkbox && container) {
      checkbox.checked = wsLogEnabled;
      container.style.display = wsLogEnabled ? "flex" : "none";
    }
  }
  function clearLog() {
    const logContent = document.getElementById("logContent");
    if (logContent) {
      logContent.innerHTML = "";
    }
  }
  async function uploadFirmware() {
    const fileInput = document.getElementById("firmwareFile");
    const status = document.getElementById("firmwareStatus");
    if (!fileInput || !status)
      return;
    if (!fileInput.files || !fileInput.files.length) {
      status.innerHTML = '<span style="color: var(--error)">Please select a .bin file</span>';
      return;
    }
    const file = fileInput.files[0];
    if (!file.name.endsWith(".bin")) {
      status.innerHTML = '<span style="color: var(--error)">File must be a .bin file</span>';
      return;
    }
    if (!window.confirm(`Upload firmware "${file.name}" (${(file.size / 1024).toFixed(1)} KB)?

The device will restart after upload.`)) {
      return;
    }
    status.innerHTML = '<span style="color: var(--info)">Uploading...</span>';
    try {
      const fd = new FormData();
      fd.append("update", file);
      const res = await window.fetch("/update-firmware", { method: "POST", body: fd });
      if (res.ok) {
        status.innerHTML = '<span style="color: var(--success)">Upload complete! Device restarting...</span>';
        window.setTimeout(() => {
          status.innerHTML += '<br><span style="color: var(--text-muted)">Refresh page in a few seconds.</span>';
        }, 2e3);
      } else {
        throw new Error(`Upload failed: ${res.status}`);
      }
    } catch (err) {
      status.innerHTML = `<span style="color: var(--error)">Error: ${getErrorMessage(err)}</span>`;
    }
  }

  // src/views/about.ts
  async function loadAboutInfo() {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const resp = await sendRequest(ws, encodeGetDebugInfoRequest());
      const data = JSON.parse(resp.json);
      const aboutVersion = document.getElementById("aboutVersion");
      if (aboutVersion) {
        aboutVersion.textContent = data.VERSION || "Unknown";
      }
    } catch {
      const aboutVersion = document.getElementById("aboutVersion");
      if (aboutVersion) {
        aboutVersion.textContent = "Error loading";
      }
    }
  }

  // src/router.ts
  function navigate() {
    const hash = window.location.hash.slice(2) || "";
    const viewId = hash.split("/")[0] || "dashboard";
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const view = document.getElementById(`view-${viewId}`);
    if (view)
      view.classList.add("active");
    document.querySelectorAll(".nav-item").forEach((n) => {
      const href = n.getAttribute("href");
      n.classList.toggle(
        "active",
        href === `#/${hash}` || hash === "" && href === "#/" || viewId === "editor" && href === "#/programs"
      );
    });
    if (viewId === "programs")
      loadProgramList();
    if (viewId === "logs")
      loadLogsList();
    if (viewId === "preferences")
      loadPreferences();
    if (viewId === "debug")
      loadDebugInfo();
    if (viewId === "about")
      loadAboutInfo();
    if (viewId === "dashboard" || viewId === "") {
      if (!chart) {
        window.setTimeout(initChart, 100);
      }
    }
  }
  function initRouter() {
    window.addEventListener("hashchange", navigate);
  }

  // src/websocket.ts
  function connect() {
    if (manualDisconnect)
      return;
    if (reconnectStartTime && Date.now() - reconnectStartTime > RECONNECT_TIMEOUT_MS) {
      log("error", "Reconnect timeout - giving up after 30s");
      setReconnectStartTime(null);
      setConnected(false);
      return;
    }
    const wsUrl = `ws://${window.location.host}/ws`;
    log("sent", `Connecting to ${wsUrl}...`);
    const socket = new WebSocket(wsUrl);
    socket.binaryType = "arraybuffer";
    setWs(socket);
    socket.onopen = () => {
      setReconnectStartTime(null);
      setConnected(true);
      log("ack", "Connected (FlatBuffers mode)");
      void loadProgramSelect();
      resetChartData();
      void loadChartHistory();
      setProgramProfile(null);
      setProgramProfileLocked(false);
    };
    socket.onclose = () => {
      setConnected(false);
      if (!manualDisconnect) {
        if (!reconnectStartTime) {
          setReconnectStartTime(Date.now());
        }
        const startTime = reconnectStartTime ?? Date.now();
        if (Date.now() - startTime < RECONNECT_TIMEOUT_MS) {
          const elapsed = Math.round((Date.now() - startTime) / 1e3);
          log("error", `Disconnected - reconnecting in 3s... (${elapsed}s elapsed)`);
          setReconnectTimeout(window.setTimeout(connect, RECONNECT_INTERVAL_MS));
        } else {
          log("error", "Reconnect timeout - giving up after 30s");
          setReconnectStartTime(null);
          setConnected(false);
        }
      }
    };
    socket.onerror = () => log("error", "WebSocket error");
    socket.onmessage = (e) => {
      try {
        if (e.data instanceof ArrayBuffer) {
          const msg = decodeServerMessage(e.data);
          if (msg) {
            handleFlatBuffersMessage(msg);
          }
        } else {
          const msg = JSON.parse(e.data);
          handleMessage(msg);
        }
      } catch (err) {
        log("error", `Parse error: ${getErrorMessage(err)}`);
      }
    };
  }
  function disconnect() {
    setManualDisconnect(true);
    setReconnectStartTime(null);
    if (reconnectTimeout !== null) {
      window.clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    if (ws) {
      ws.close();
      setWs(null);
    }
    setConnected(false);
  }
  function manualConnect() {
    setManualDisconnect(false);
    setReconnectStartTime(null);
    connect();
  }
  function setConnected(connected) {
    const el = document.getElementById("connection");
    if (!el)
      return;
    el.classList.toggle("connected", connected);
    let statusText = "Disconnected";
    if (connected) {
      statusText = "Connected";
    } else if (!manualDisconnect && reconnectStartTime !== null) {
      statusText = "Reconnecting...";
    }
    const span = el.querySelector("span");
    if (span)
      span.textContent = statusText;
    const connectBtn = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    if (connectBtn) {
      connectBtn.disabled = connected || !manualDisconnect && reconnectStartTime !== null;
    }
    if (disconnectBtn) {
      disconnectBtn.disabled = !connected && (manualDisconnect || reconnectStartTime === null);
    }
    const chartOverlay = document.getElementById("chartConnectionLost");
    if (chartOverlay) {
      chartOverlay.style.display = connected ? "none" : "flex";
    }
    if (!connected) {
      const statusKiln = document.getElementById("statusKiln");
      const statusTarget = document.getElementById("statusTarget");
      const statusEnv = document.getElementById("statusEnv");
      const statusHeat = document.getElementById("statusHeat");
      const statusBadge = document.getElementById("statusBadge");
      if (statusKiln)
        statusKiln.textContent = "N/A";
      if (statusTarget)
        statusTarget.textContent = "N/A";
      if (statusEnv)
        statusEnv.textContent = "N/A";
      if (statusHeat)
        statusHeat.textContent = "N/A";
      if (statusBadge) {
        statusBadge.textContent = "OFFLINE";
        statusBadge.className = "program-status error";
      }
    }
  }
  function handleMessage(msg) {
    if (msg.type !== "state") {
      log(msg.type, JSON.stringify("data" in msg ? msg.data : msg));
    }
    if (msg.type === "state") {
      setState(msg.data);
      updateUI();
      if (state.kiln_temp !== void 0 && state.set_temp !== void 0) {
        addChartPoint(state.kiln_temp, state.set_temp, state.env_temp, state.case_temp);
      }
      handleProgramProfileUpdate();
    }
  }
  function updateSimulatorUI() {
    const container = document.getElementById("simulatorControls");
    const slider = document.getElementById("timeScaleSlider");
    const label = document.getElementById("timeScaleLabel");
    const badge = document.getElementById("simulatorBadge");
    if (container) {
      container.style.display = isSimulator ? "flex" : "none";
    }
    if (slider && Math.abs(slider.valueAsNumber - timeScale) > 0.1) {
      slider.value = String(timeScale);
    }
    if (label) {
      label.textContent = `${timeScale.toFixed(1)}x`;
    }
    if (badge) {
      badge.style.display = isSimulator ? "inline" : "none";
    }
  }
  function sendTimeScale(scale) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(encodeSetTimeScaleCommand(scale));
    }
  }
  function clearError() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(encodeClearErrorCommand());
    }
  }
  function updateErrorOverlay(s) {
    const overlay = document.getElementById("errorOverlay");
    const messageEl = document.getElementById("errorMessage");
    if (!overlay)
      return;
    if (s.program_status === 5 && s.error_message) {
      if (messageEl)
        messageEl.textContent = s.error_message;
      overlay.style.display = "flex";
    } else {
      overlay.style.display = "none";
    }
  }
  function handleFlatBuffersMessage(msg) {
    if ("requestId" in msg && msg.requestId > 0) {
      if (resolvePendingRequest(msg.requestId, msg)) {
        return;
      }
    }
    switch (msg.type) {
      case "state": {
        const s = msg;
        const newState = {
          program_status: s.programStatus,
          program_name: s.programName,
          kiln_temp: s.kilnTemp,
          set_temp: s.setTemp,
          env_temp: s.envTemp,
          case_temp: s.caseTemp,
          heat_percent: s.heatPercent,
          temp_change: s.tempChange,
          step: s.step || "",
          prog_start: s.progStartMs ? new Date(Number(s.progStartMs)).toISOString() : null,
          prog_end: s.progEndMs ? new Date(Number(s.progEndMs)).toISOString() : null,
          curr_time: new Date(Number(s.currTimeMs)).toISOString(),
          error_message: s.errorMessage
        };
        setState(newState);
        setIsSimulator(s.isSimulator);
        setTimeScale(s.timeScale);
        if (s.isSimulator && s.currTimeMs) {
          setSimulatedNow(Number(s.currTimeMs));
        } else {
          setSimulatedNow(null);
        }
        updateSimulatorUI();
        updateErrorOverlay(newState);
        updateUI();
        if (newState.kiln_temp !== void 0 && newState.set_temp !== void 0) {
          addChartPoint(newState.kiln_temp, newState.set_temp, newState.env_temp, newState.case_temp);
        }
        handleProgramProfileUpdate();
        break;
      }
      case "ack":
        log("ack", `success: ${msg.success}${msg.error ? `, error: ${msg.error}` : ""}`);
        break;
      case "error":
        log("error", `Error ${msg.code}: ${msg.message}`);
        break;
      default:
        log("received", `Unknown message type: ${msg.type}`);
    }
  }

  // src/commands.ts
  function sendCommand(action, params = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log("error", "Not connected");
      return;
    }
    let encoded = null;
    switch (action) {
      case "start":
        encoded = encodeStartCommand(
          params.segment,
          params.minute
        );
        break;
      case "pause":
        encoded = encodePauseCommand();
        break;
      case "resume":
        encoded = encodeResumeCommand();
        break;
      case "stop":
        encoded = encodeStopCommand();
        break;
      case "load":
        encoded = encodeLoadCommand(params.program);
        break;
      case "unload":
        encoded = encodeUnloadCommand();
        break;
      case "set_temp":
        encoded = encodeSetTempCommand(params.temperature);
        break;
      default:
        log("error", `Unknown command: ${action}`);
        return;
    }
    if (encoded) {
      log("sent", `[FlatBuffers] ${action}`);
      ws.send(encoded);
    }
  }
  function loadProgram() {
    const select = document.getElementById("programSelect");
    if (!select) {
      log("error", "Program select not found");
      return;
    }
    const program = select.value;
    if (!program) {
      log("error", "Select a program first");
      return;
    }
    sendCommand("load", { program });
  }
  function clearProgram() {
    if (state.program_status === 2) {
      window.alert("Cannot unload while program is running. Stop the program first.");
      return;
    }
    sendCommand("unload");
    setProgramProfile(null);
    setProgramProfileLocked(false);
    const select = document.getElementById("programSelect");
    if (select)
      select.value = "";
    updateChartData();
    setDefaultView();
  }
  function setTemperature() {
    const input = document.getElementById("tempInput");
    const temp = input ? parseFloat(input.value) : NaN;
    if (Number.isNaN(temp)) {
      log("error", "Invalid temperature");
      return;
    }
    sendCommand("set_temp", { temperature: temp });
  }
  async function reboot() {
    if (!window.confirm("Reboot the device?"))
      return;
    log("sent", "POST /api/reboot");
    try {
      const res = await window.fetch("/api/reboot", { method: "POST" });
      const data = await res.json();
      log("ack", JSON.stringify(data));
    } catch (err) {
      log("error", getErrorMessage(err));
    }
  }

  // src/main.ts
  window.addEventListener("load", () => {
    initWsLogState();
    initEditorListeners();
    initRouter();
    navigate();
    connect();
    window.setTimeout(() => {
      void loadChartHistory();
    }, 500);
    const slider = document.getElementById("timeScaleSlider");
    if (slider) {
      slider.addEventListener("input", () => {
        const scale = parseFloat(slider.value);
        const label = document.getElementById("timeScaleLabel");
        if (label)
          label.textContent = `${scale.toFixed(1)}x`;
      });
      slider.addEventListener("change", () => {
        const scale = parseFloat(slider.value);
        sendTimeScale(scale);
      });
    }
  });
  Object.assign(window, {
    sendCommand,
    manualConnect,
    disconnect,
    loadProgram,
    clearProgram,
    setTemperature,
    reboot,
    createProgram,
    editProgram,
    saveProgram,
    cancelEdit,
    deleteProgram,
    loadProgramList,
    togglePreview,
    loadLogsList,
    viewLog,
    downloadLog,
    loadPreferences,
    savePreferences,
    loadDebugInfo,
    loadAboutInfo,
    resetZoom,
    toggleAutoScroll,
    centerOnProgram,
    uploadFirmware,
    toggleWsLog,
    clearLog,
    clearError
  });
})();
//# sourceMappingURL=app.js.map
