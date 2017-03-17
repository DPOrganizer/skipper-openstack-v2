# [<img title="skipper-openstack-v2 - Openstack Swift adapter for Skipper" src="http://i.imgur.com/P6gptnI.png" width="200px" alt="skipper emblem - face of a ship's captain"/>](https://github.com/IBM-Bluemix/skipper-openstack) adapter for OpenStack Swift

[![NPM version](https://badge.fury.io/js/skipper-openstack-v2.png)](http://badge.fury.io/js/skipper-openstack-v2) &nbsp; &nbsp;
[![Dependencies](https://david-dm.org/dporganizer/skipper-openstack-v2.svg)](https://david-dm.org/dporganizer/skipper-openstack-v2)

[Skipper](https://github.com/balderdashy/skipper) is a piece of middleware for Express that allows you to pipe/stream multipart form uploads for various storage endpoints. This project implements an OpenStack Swift adapter for Skipper.

This adapter is a new version of [skipper-openstack](https://github.com/IBM-Bluemix/skipper-openstack) that is up-to-date, actually working and more feature complete. It's written in ES6.


## Examples

```javascript
// api/controllers/UploadController.js
const crypto = require('crypto');
const skipperSwift = require('skipper-openstack-v2');

const algorithm = 'aes-256-ctr';

module.exports = {
  download: (req, res) => {
    const password = 'my-encryption-password';

    skipperSwift.read({
      container: 'my-container',
      credentials: {
        username: 'my-user@example.com',
        password: 'MySecretPasswordHere1337',
        authUrl: 'https://auth.my.openstack.url.com:5000',
        projectId: '<tenant id (md5 hash)>',
		region: 'regionOne',
      },
      fileEncryption: {
        encrypt: crypto.createCipher(algorithm, password),
        decrypt: crypto.createDecipher(algorithm, password);
      },
    }, req.params.filename, res);
  },
};
```

## Configuration options

-

## TODO

- Write tests
