const pkgcloud = require('pkgcloud');
const Writable = require('stream').Writable;
const crypto = require('crypto');
const debug = require('debug')('skipper-openstack-v2');

const getClient = (credentials) => (
	pkgcloud.storage.createClient({
		provider: 'openstack',
		username: credentials.username,
		password: credentials.password,
		authUrl: credentials.authUrl,
		tenantId: credentials.tenantId,
		region: credentials.region,
		version: '2',
	})
);

module.exports = function SwiftStore(globalOpts) {
	const getOptions = (options = {}) => (
		Object.assign({
			getFilename: (newFile) => newFile.filename,
		}, globalOpts || {}, options)
	);

	const adapter = {
		read(opts, file, response) {
			const options = getOptions(opts);
			const client = getClient(options.credentials);

			let downloadStream = client.download({
				container: options.container,
				remote: file,
			});

			if (options.fileEncryption && options.fileEncryption.enabled) {
				const { algorithm, password } = options.fileEncryption;
				downloadStream = downloadStream.pipe(crypto.createCipher(algorithm, password));
			}

			downloadStream.pipe(response);
		},

		rm(fd, callback) {
			const options = getOptions();
			const client = getClient(options.credentials);

			client.removeFile(options.container, fd, callback);
		},

		ls(opts, callback) {
			const options = getOptions(opts);
			const client = getClient(options.credentials);

			client.getFiles(options.container, callback);
		},

		receive(opts) {
			const options = getOptions(opts);
			const receiver = Writable({
				objectMode: true,
			});

			receiver._write = (newFile, encoding, done) => {
				const client = getClient(options.credentials);

				const uploadCallback = (err) => {
					if (err) {
						debug('Error occurred during upload: %j', err);
						receiver.emit('error', err);
						return;
					}

					done();
				};

				const filename = options.getFilename(newFile);

				// TODO: Investigate why .pipe(encrypt) cannot be assigned to variable
				debug('Uploading file with name %s', filename);
				if (options.fileEncryption && options.fileEncryption.enabled) {
					const { algorithm, password } = options.fileEncryption;

					newFile
						.pipe(crypto.createCipher(algorithm, password))
						.pipe(client.upload({
							container: options.container,
							remote: filename,
						}, uploadCallback));
				} else {
					newFile
						.pipe(client.upload({
							container: options.container,
							remote: filename,
						}, uploadCallback));
				}

				newFile.on('end', (err, value) => {
					debug('Finished uploading %s', filename);
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
