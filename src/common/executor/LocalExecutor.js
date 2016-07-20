/*globals define*/
// Executor for running in 'single node mode' (aka 'npm run local')
define([
    'blob/BlobClient',
    'underscore',
    'q'
], function(
    BlobClient,
    _,
    Q
) {
    'use strict';
    
    var WORKING_DIR = './src/worker/tmp/',
        EXEC_CONFIG = 'executor_config.json';

    var LocalExecutor = function(opts) {
        var EventEmitter = require('events');

        _.extend(this, EventEmitter.prototype);

        this.blobClient = new BlobClient({
            server: '127.0.0.1',
            logger: opts.logger,
            serverPort: opts.gmeConfig.server.port,
            httpsecure: false
        });
        this.logger = opts.logger.fork('LocalExecutor');
    };

    LocalExecutor.prototype.createWorkingDir = function(fs, hash) {
        var deferred = Q.defer();

        this.workingDir = WORKING_DIR + hash + '/';
        this.hash = hash;

        this.logger.debug(`prepping job ${hash}`);
        fs.exists(this.workingDir, exists => {
            if (!exists) {
                this.logger.info(`Creating working directory ${this.workingDir}`);
                fs.mkdirSync(this.workingDir);
            }
            deferred.resolve();
        });

        return deferred.promise;
    };

    LocalExecutor.prototype.unzipJob = function() {
        // TODO
    };

    LocalExecutor.prototype.createJob = function(hash) {
        // Download the job
        var fs = require('fs'),
            childProcess = require('child_process'),
            job,
            zipFile,
            err = '';

        this.spawn = childProcess.spawn;
        this.logger.info(`Creating job ${hash}`);
        this.createWorkingDir(fs, hash)
            .then(() => {
                this.logger.info(`Retrieving job info ${hash}`);
                zipFile = `${hash}.zip`;
                return this.blobClient.getObject(hash);
            })
            .then(object => {
                this.logger.info('Retrieved job info!');
                var content = new Buffer(new Uint8Array(object));
                this.logger.info(`Creating zip file ${zipFile}`);
                fs.writeFileSync(this.workingDir + '/' + zipFile, content);

                // Unzip
                this.logger.info('unzipping from ' + this.workingDir);
                job = this.spawn('unzip', [zipFile], {
                    cwd: this.workingDir
                });
                job.stdout.on('data', data => process.stdout.write(data.toString()));
                job.stderr.on('data', data => err += data);
                job.on('close', code => {
                    this.logger.info('unzip complete! Exit code: ' + code);
                    if (code === 0) {
                        //fs.unlinkSync(zipFile);
                        this.executeJob(fs);
                    } else {
                        this.emit('error', `Unzip failed: ${err || 'exit code: ' + code}`);
                    }
                });

            })
            .fail(err => this.logger.error(`${hash} job creation failed: ${err}`));
    };

    LocalExecutor.prototype.executeJob = function(fs) {
        this.logger.info('loading execution config');
        fs.readFile(this.workingDir + EXEC_CONFIG, 'utf8', (err, json) => {
            var config = JSON.parse(json),
                cmd = config.cmd,
                error = '',
                job;

            if (err) {
                this.logger.error(err);
                return this.emit('error', err);
            }

            this.config = config;
            this.logger.info('config is ' + json);
            this.logger.info('Running ' + cmd);
            job = this.spawn(cmd, config.args || [], {
                cwd: this.workingDir
            });
            job.stdout.on('data', data => this.emit('stdout', data.toString()));
            job.stderr.on('data', data => error += data);
            job.on('close', code => {
                if (code !== 0) {
                    this.emit('error', error);
                }

                // Write stderr to file
                // TODO

                // Write stdout to file
                // TODO

                this.onJobComplete(code && error);
            });
        });
    };

    LocalExecutor.prototype.onJobComplete = function(err) {
        // Upload the resultArtifacts
        // TODO

        // Trigger the 'end' event w/ status and artifact hashes
        this.emit('end', err ? 'FAILED' : 'SUCCESS', {});
    };

    LocalExecutor.prototype.saveJobResults = function() {
        // I can use ExecutorWorker if I create 
        return ExecutorWorker.prototype.saveJobResults.call(this,
            this.jobInfo,// TODO: Add the jobInfo
            this.workingDir,
            this.config
        );
    };

    if (typeof WebGMEGlobal === 'undefined') {
        LocalExecutor.prototype.sendJobUpdate =
            ExecutorWorker.prototype.sendJobUpdate;
    }

    return LocalExecutor;
});
