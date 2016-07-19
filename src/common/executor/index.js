/*globals define*/
define([
    './Executor',
    './LocalExecutor'
], function(
    Executor,
    LocalExecutor
) {
    'use strict';

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

    if (typeof process !== 'undefined' && process.env.SINGLE_NODE_MODE) {
        return LocalExecutor;
    } else {
        return Executor;
    }

});
