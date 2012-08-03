var util = require('util')
var Stream = require('stream')
var spawn = require('child_process').spawn

function Cli (cmd, args, options) {
	if ( !(this instanceof Cli) )
		return new Cli(cmd, args, options)

	Stream.call(this)

	// Options
	this.cmd = cmd
	this.args = args
	this.options = options

	// Stream states
	this.readable = true
	this.writable = true
	this.ended = false
	this.paused = false
	this.needDrain = false

	// Spawn the CLI
	var self = this
	var handle = spawn(cmd, args, options)
	this._handle = handle
	this._in = handle.stdin

	var exitMessage = null
	handle.on('exit', function (code, signal) {
		if (code !== 0) self.emit( 'error', new Error(exitMessage || '') )

		self.ended = true
		self.write = self.write_end
		self._handle = null
		self._in = null
		self.emit('end')
	})
	handle.stderr.on('data', function (data) {
		self.emit('error', data)
	})
	handle.stdout.on('data', function (data) {
		exitMessage = data.toString()
		self.emit('data', data)
	})
}
util.inherits(Cli, Stream)

Cli.prototype.write = function (data) {
	return data ? this._in.write(data) : true
}

Cli.prototype.write_end = function () {
	this.emit( 'error', new Error('write after end') )
	return false
}

Cli.prototype.end = function (data) {
	this.write(data)

	process.kill( this._handle.pid )
}

Cli.prototype.pause = function () {
	this.paused = true
}

Cli.prototype.resume = function () {
	this.paused = false
	if (!this.ended) this.write()
}

Cli.prototype.destroy = function () {
	this.readable = false
	this.writable = false
}

module.exports = Cli
