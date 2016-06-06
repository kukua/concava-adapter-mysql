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
const adapter = require('concava-adapter-mysql')

// Connection configuration
var config = {
	host: 'mysql',
	user: process.env['MYSQL_USER'],
	password: process.env['MYSQL_PASS'],
	database: process.env['ON_CREATE_DB'],
	timeout: 3000, // ms
}

module.exports = {
	debug: true,
	auth: {
		enabled: true,
		method: adapter.auth,
		config: config,
		sql: '', // Custom query
	},
	metadata: {
		method: adapter.metadata,
		config: config,
		attributeSql: '', // Custom query
		converterSql: '', // Custom query
		calibratorSql: '', // Custom query
		validatorSql: '', // Custom query
	},
	storage: {
		method: adapter.storage,
		config: config,
		sql: '', // Custom query
	},
}
```

Provide a custom SQL query with `auth.sql`. In this query all values from `req.auth` will be replaced. By default these are:

- `:header`: full authorization header
- `:token`: token from authorization header (requires `auth.byToken = true`)
- `:udid`: unique device ID (ConCaVa v0.5+)

## License

This software is licensed under the [MIT license](https://github.com/kukua/node-concava-adapter-mqtt/blob/master/LICENSE).

© 2016 Kukua BV
