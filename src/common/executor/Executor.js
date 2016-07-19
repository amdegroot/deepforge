/*globals define, Backbone*/
define([
    'executor/ExecutorClient',
    'underscore'
], function(
    ExecutorClient,
    _
) {

    var DEFAULT_INTERVAL = 1500;
    var Executor = function(opts) {
        this._execClient = new ExecutorClient({
            logger: opts.logger,
            serverPort: opts.gmeConfig.server.port
        });
        this.updateInterval = opts.interval || DEFAULT_INTERVAL;
        this._hash = null;
        this._currentLine = null;
    };

    if (typeof Backbone !== 'undefined') {
        _.extend(Executor.prototype, Backbone.Events);
    }

    Executor.STD_OUT = 'stdout';
    Executor.START = 'start';
    Executor.END = 'end';
    Executor.prototype.createJob = function(hash) {
        this._hash = hash;
        this._currentLine = 0;
        this._execClient.createJob({hash})
            .then(() => this._watchJob());
    };

    Executor.prototype._watchJob = function() {
        var hash = this._hash,
            info;

        return this._execClient.getInfo(hash)
            .then(_info => {  // Update the job's stdout
                var actualLine,  // on executing job
                    currentLine = this._currentLine;

                info = _info;
                actualLine = info.outputNumber;
                if (actualLine !== null && actualLine >= currentLine) {
                    this._currentLine = actualLine + 1;
                    return this._execClient.getOutput(hash, currentLine, actualLine+1)
                        .then(outputLines => {
                            var output = outputLines.map(o => o.output).join('');
                            this.trigger(Executor.STD_OUT, output);
                        });
                }
            })
            .then(() => {
                if (info.status === 'CREATED' || info.status === 'RUNNING') {
                    if (info.status === 'RUNNING' &&
                        this._state !== 'RUNNING') {

                        this._state = 'RUNNING';
                        this.trigger(Executor.START);
                    }

                    return setTimeout(this._watchJob.bind(this), this.updateInterval);
                }

                this.trigger(Executor.END, info.status, info.resultHashes);
            })
            .catch(err => this.trigger('error', err));
    };

    // Executors need to be able to:
    //   - create/start jobs
    //   - return stdout (on some interval?)
    //     - this may be nice to do differently. The process shouldn't need to be polled
    //   - query when started
    // TODO
    //
    // We can probably think of these as event handlers:
    //   - 'start'
    //   - 'stdout'
    //   - 'finish'
    //
    // in the future, potentially adding 'metadata' or 'file'
    return Executor;
});
