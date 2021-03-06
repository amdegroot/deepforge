/*jshint node:true, mocha:true*/
/**
 * Generated by PluginGenerator 0.14.0 from webgme on Tue Mar 15 2016 21:19:45 GMT-0500 (CDT).
 */

'use strict';
var testFixture = require('../../globals'),
    SEED_DIR = testFixture.path.join(testFixture.DF_SEED_DIR, 'nn'),
    assert = require('assert');

describe('CreateTorchMeta', function () {
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('CreateTorchMeta'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        projectName = 'testProject',
        pluginName = 'CreateTorchMeta',
        Q = testFixture.Q,
        core,
        project,
        gmeAuth,
        storage,
        ORIG_META = {},
        META = {},
        origRoot,
        root,
        commitHash;

    before(function (done) {
        this.timeout(5000);
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: testFixture.path.join(SEED_DIR, 'nn.webgmex'),
                    projectName: projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                project = importResult.project;
                core = importResult.core;
                commitHash = importResult.commitHash;
                origRoot = importResult.rootNode;
                return project.createBranch('test', commitHash);
            })
            // Run the plugin
            .then(() => {
                var manager = new PluginCliManager(null, logger, gmeConfig),
                    metaDict = core.getAllMetaNodes(origRoot),
                    context = {
                        project: project,
                        commitHash: commitHash,
                        branchName: 'test',
                        activeNode: '/960660211'
                    };


                // Populate the META object
                Object.keys(metaDict)
                    .map(id => metaDict[id])
                    .forEach(node => ORIG_META[core.getAttribute(node, 'name')] = node);

                return Q.ninvoke(
                    manager,
                    'executePlugin',
                    pluginName,
                    {removeOldLayers: true},
                    context
                );
            })
            .then(pluginResult => {
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(true);

                return project.getBranchHash('test');
            })
            .then(function (branchHash) {
                return Q.ninvoke(project, 'loadObject', branchHash);
            })
            .then(function (commitObject) {
                return Q.ninvoke(core, 'loadRoot', commitObject.root);
            })
            .then(function (rootNode) {
                var metaDict = core.getAllMetaNodes(rootNode);
                root = rootNode;

                // Populate the META object
                Object.keys(metaDict)
                    .map(id => metaDict[id])
                    .forEach(node => META[core.getAttribute(node, 'name')] = node);

            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            .then(function () {
                return gmeAuth.unload();
            })
            .nodeify(done);
    });

    it('should run plugin and update the branch', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
            },
            context = {
                project: project,
                commitHash: commitHash,
                branchName: 'test',
                activeNode: '/960660211'
            };

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(typeof pluginResult).to.equal('object');
            expect(pluginResult.success).to.equal(true);

            project.getBranchHash('test')
                .then(function (branchHash) {
                    expect(branchHash).to.not.equal(commitHash);
                })
                .nodeify(done);
        });
    });

    it('should create META nodes', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
            },
            context = {
                project: project,
                commitHash: commitHash,
                branchName: 'test',
                activeNode: '/960660211'
            },
            META_NAMES = [  // Some Torch layer names to look up
                'ReLU',
                'LeakyReLU',
                'TemporalConvolution',
                'SpatialConvolution',
                'Linear',
                'SparseLinear'
            ];

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(typeof pluginResult).to.equal('object');
            expect(pluginResult.success).to.equal(true);

            project.getBranchHash('test')
                .then(function (branchHash) {
                    return Q.ninvoke(project, 'loadObject', branchHash);
                })
                .then(function (commitObject) {
                    return Q.ninvoke(core, 'loadRoot', commitObject.root);
                })
                .then(function (rootNode) {
                    var metaNodes = core.getAllMetaNodes(rootNode),
                        names;
                    names = Object.keys(metaNodes)
                        .map(id => metaNodes[id])
                        .map(node => core.getAttribute(node, 'name'));

                    META_NAMES
                        .forEach(name => assert.notEqual(names.indexOf(name), -1,
                            'Missing node "' + name + '"'));
                })
                .nodeify(done);
        });
    });

    it('should update existing layers', function () {
        var scGuid = core.getGuid(ORIG_META.SpatialConvolution);
        // Check the guid of spatial convolution
        expect(scGuid).to.equal(core.getGuid(META.SpatialConvolution));
    });

    it('should add attributes', function () {
        // check that "Linear" has multiple attrs
        var attrs = core.getAttributeNames(META.Linear);
        assert.notEqual(attrs.length, 1, `missing attributes! ${attrs}`);
    });

    it('should create string attributes', function () {
        // check that "Linear" has an attribute called "output"
        var attr = core.getAttributeMeta(META.Add, 'scalar');
        assert.equal(attr.type, 'string');
    });


    it('should place the nodes in the Language node', function () {
        var metaDict = core.getAllMetaNodes(root),
            metaNodes,
            nodes,
            langNode;

        metaNodes = Object.keys(metaDict)
            .map(id => metaDict[id]);

        langNode = metaNodes
            .find(node => core.getAttribute(node, 'name') === 'Language' );

        nodes = metaNodes
            .filter(node => core.getAttribute(node, 'name') !== 'FCO' &&
                core.getAttribute(node, 'name') !== 'Language' );

        nodes.forEach(node => assert.equal(core.getParent(node), langNode));
    });

});
