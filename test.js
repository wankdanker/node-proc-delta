var watcher = require('./')({ interval : 5000 });

watcher.watch({ command : 'node' })
watcher.on('sample', function (pid, delta, proc) {
	console.log(proc.COMMAND, delta);
});
