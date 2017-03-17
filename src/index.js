const pkgcloud = require('pkgcloud');
const Writable = require('stream').Writable;
const debug = require('debug')('skipper-openstack-v2');

const getClient = (credentials) => (
	pkgcloud.storage.createClient({
		provider: 'openstack',
		username: credentials.username,
		password: credentials.password,
		authUrl: credentials.authUrl,
		tenantId: credentials.projectId,
		region: credentials.region,
		version: '2',
	})
);

const getOptions = (globalOpts, options = {}) => Object.assign({}, globalOpts, options);

module.exports = function SwiftStore(opts) {
	const globalOpts = opts || {};

	const adapter = {
		read(options, file, response) {
			const client = getClient(options.credentials);

			let downloadStream = client.download({
				container: options.container,
				remote: file,
			});

			if (options.fileEncryption && options.fileEncryption.decrypt) {
				downloadStream = downloadStream.pipe(options.fileEncryption.decrypt);
			}

			downloadStream.pipe(response);
		},

		rm(fd, callback) {
			const options = getOptions(globalOpts);
			const client = getClient(options.credentials);

			client.removeFile(options.container, fd, callback);
		},

		ls(options, callback) {
			const client = getClient(options.credentials);

			client.getFiles(options.container, callback);
		},

		receive(options) {
			const receiver = Writable({
				objectMode: true,
			});

			receiver._write = (newFile, encoding, done) => {
				const client = getClient(options.credentials);

				let fileStream = newFile;
				if (options.fileEncryption && options.fileEncryption.encrypt) {
					fileStream = fileStream.pipe(options.fileEncryption.encrypt);
				}

				debug('Uploading file with name %s', fileStream.filename);
				fileStream
					.pipe(client.upload({
						container: options.container,
						remote: fileStream.filename,
					}, (err) => {
						if (err) {
							debug(err);
							receiver.emit('error', err);
							return;
						}

						done();
					}));

				fileStream.on('end', (err, value) => {
					debug('Finished uploading %s', fileStream.filename);
					receiver.emit('finish', err, value);
					done();
				});
			};

			return receiver;
		},
		ensureContainerExists(credentials, containerName, callback) {
			const client = getClient(credentials);

			client.getContainers((error, containers) => {
				if (error) {
					return callback(error);
				}
				if (containers.length === 0) {
					return client.createContainer(containerName, callback);
				}

				const found = containers.find((container) => container.name === containerName);
				if (!found) {
					return callback(null);
				}

				return client.createContainer(containerName, callback);
			});
		},
	};

	return adapter;
};
