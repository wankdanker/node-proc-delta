var ps = require('psjson').ps;
var procpid = require('proc-pid')({ stats : ['io'] });
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

module.exports = function (options) {
	return new ProcDelta(options);
};

module.exports.options = {
	interval : 1000
};

function ProcDelta (options) {
	var self = this;

	EventEmitter.call(self);

	self.options = options || module.exports.options;
	self.procs = {};
}

inherits(ProcDelta, EventEmitter);

module.exports.filters = {
	command : function (val) { return function (x) { return ~x.COMMAND.indexOf(val) }}
	, pid : function (val) { return function (x) { return x.PID == val }}
};

ProcDelta.prototype.watch = function (filter) {
	var self = this;

	self.interval = setInterval(function () {
		ps('ps -aux', function (err, list) {
			list = list.rows;

			list = processFilters(filter, list);	

			list.forEach(function (proc) {
				proc = self.procs[proc.PID] = self.procs[proc.PID] || proc;

				procpid.pid(proc.PID, function (err, data) {
					if (!proc.initial) {
						proc.initial = data.io
						proc.previous = data.io;
					}
					else {
						proc.previous = proc.current;
					}
					
					proc.lastSeen = new Date();
					proc.current = data.io;
					proc.delta = proc.delta || {};

					Object.keys(proc.current).forEach(function (key) {
						proc.delta[key] = proc.current[key] - proc.previous[key];
					});

					self.emit(proc.PID, proc.delta);
					self.emit('sample', proc.PID, proc.delta, proc);
				});
			});
		});
	}, self.options.interval);
};

ProcDelta.prototype.end = function () {
	var self = this;

	clearInterval(self.interval);
};

function processFilters (filter, list) {
	Object.keys(module.exports.filters).forEach(function (key) {
		var fn = module.exports.filters[key];

		if (filter[key]) {
			list = list.filter(fn(filter[key]));
		}
	});
	
	return list;
}
