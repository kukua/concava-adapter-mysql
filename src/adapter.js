import mysql from 'mysql'
import merge from 'utils-merge'
import map from 'map-async'
import waterfall from 'async-waterfall'

// MySQL client
function queryFormat (query, values) {
	if ( ! values) return query
	return query.replace(/\:(\w+)/g, function (val, key) {
		if (values.hasOwnProperty(key)) {
			return this.escape(values[key])
		}
		return val
	}.bind(this))
}
var getClient = (config) => {
	if ( ! config._client) {
		config._client = mysql.createPool(merge({
			waitForConnections: true,
			connectionLimit: 100,
			queueLimit: 0, // Disable
			queryFormat,
		}, config))
	}

	return config._client
}
var getQueryMethod = (req, config) => {
	var client = getClient(config)
	return (sql, values, cb) => {
		client.query({
			sql: (config.authQuery || authQuery),
			timeout: config.timeout,
			values: [req.auth.token],
		}, cb)
	}
}

// Authorization adapter
var authQuery = `
	SELECT users.* FROM users
	INNER JOIN user_tokens ON user_tokens.user_id = users.id
	WHERE user_tokens.token = :token
	LIMIT 1
`

export let auth = (req, { config }, data, cb) => {
	getQueryMethod(req, config.config)(
		(config.authQuery || authQuery),
		req.auth.token,
		(err, rows) => {
			if (err) return cb(err)
			if ( ! rows[0]) return cb('No user for token.')

			cb(null, rows[0])
		}
	)
}

// Metadata adapter
var cache = {}

export let metadata = (req, config, data, { SensorAttribute }, cb) => {
	var id = data.getDeviceId()

	// Check cache
	var cached = cache[id]

	if (cached && cached.timestamp > Date.now() - config.cacheExpireTime) {
		data.setAttributes(cached.attributes)
		return cb()
	}

	// Query metadata
	var scope = {
		query: getQueryMethod(req, config.config),
		SensorAttribute,
	}

	waterfall([
		(cb) => { cb(null, data.getDeviceId()) },
		getAttributes.bind(scope),
		setConverters.bind(scope),
		setCalibrators.bind(scope),
		setValidators.bind(scope),
		(attributes, cb) => { cb(null, attributes.map((attr) => attr.instance)) },
	], (err, attributes) => {
		if (err) return cb(err)
		if ( ! attributes.length) return cb('No metadata available for device ' + id)

		// Cache result
		cache[id] = { attributes, timestamp: Date.now() }

		// Done
		data.setAttributes(attributes)
		cb()
	})
}

function getAttributes (deviceId, cb) {
	this.query(
		'SELECT * FROM attributes WHERE device_id = :id ORDER BY `order`',
		{ id: deviceId },
		(err, rows) => {
			if (err) return cb(err)

			cb(null, rows.map((row) => ({
				id: row.id,
				instance: new this.SensorAttribute(row.name),
			})))
		}
	)
}
function setConverters (attributes, cb) {
	map(attributes, (attr, cb) => {
		this.query(
			'SELECT type, value FROM converters WHERE attribute_id = :id ORDER BY `order`',
			{ id: attr.id },
			(err, rows) => {
				if (err) return cb(err)

				rows.forEach((row) => {
					attr.instance.addConverter(row.type, row.value)
				})
				cb(null, attr)
			}
		)
	}, cb)
}
function setCalibrators (attributes, cb) {
	map(attributes, (attr, cb) => {
		this.query(
			'SELECT fn FROM calibrators WHERE attribute_id = :id ORDER BY `order`',
			{ id: attr.id },
			(err, rows) => {
				if (err) return cb(err)

				rows.forEach((row) => {
					attr.instance.addCalibrator(new Function('value', row.fn))
				})
				cb(null, attr)
			}
		)
	}, cb)
}
function setValidators (attributes, cb) {
	map(attributes, (attr, cb) => {
		this.query(
			'SELECT type, value FROM validators WHERE attribute_id = :id ORDER BY `order`',
			{ id: attr.id },
			(err, rows) => {
				if (err) return cb(err)

				rows.forEach((row) => {
					attr.instance.addValidator(row.type, row.value)
				})
				cb(null, attr)
			}
		)
	}, cb)
}

// Storage adapter
export let storage = (req, config, data, cb) => {
	cb('MySQL storage not yet supported.')
}