# ConCaVa MySQL adapter

> ConCaVa adapter for authorization, metadata and storage through MySQL.

See [ConCaVa with MySQL and InfluxDB](https://github.com/kukua/concava-setup-mysql-influxdb) for a working setup.

Requires ConCaVa v0.4+.

## Install

```bash
npm install concava-adapter-mysql
```

## Configure

A ConCaVa configuration example:

```js
import { auth, metadata, storage } from 'concava-adapter-mysql'

var config = {
	host: 'mysql',
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASS,
	database: process.env.ON_CREATE_DB,
	timeout: 3000, // ms
	authQuery: '', // Custom query
}

export default {
	debug: true,
	auth: {
		enabled: true,
		method: auth,
		config,
	},
	metadata: {
		method: metadata,
		config,
	},

	// NOTE: Not yet supported. Use other storage adapter instead.
	storage: {
		method: storage,
		config,
	},
}
```

Provide a custom SQL query with `authQuery`. In this query all values from `req.auth` will be replaced. Default replacements:

- `:header`: full authorization header
- `:token`: token from authorization header (requires `auth.byToken = true`)
