import mysql from 'mysql'
import map from 'map-async'
import waterfall from 'async-waterfall'

var getQueryMethod = (client, config) => {
	return (sql, values, cb) => {
		client.query({
			sql: sql.replace(/\:(\w+)/g, function (val, key) {
				if ( ! values.hasOwnProperty(key)) return val
				return client.escape(values[key])
			}),
			timeout: config.timeout,
		}, cb)
	}
}

// Authorization adapter
var authQuery = `
	SELECT users.* FROM users
	INNER JOIN user_tokens ON user_tokens.user_id = users.id
	WHERE user_tokens.token = :token
	LIMIT 1`

export let auth = (req, { config }, data, cb) => {
	var client = mysql.createConnection(config)

	getQueryMethod(client, config)(
		(config.authQuery || authQuery),
		req.auth,
		(err, rows) => {
			client.destroy()

			if (err) return cb(err)
			if ( ! rows[0]) return cb('No user for token.')

			cb(null, rows[0])
		}
	)
}

// Metadata adapter
var cache = {}

export let metadata = (req, options, data, { SensorAttribute }, cb) => {
	// Check cache
	var id = data.getDeviceId()
	var cached = cache[id]

	if (cached && cached.timestamp > Date.now() - options.cacheExpireTime) {
		data.setAttributes(cached.attributes)
		return cb()
	}

	// Query metadata
	var { config } = options
	var client = mysql.createConnection(config)
	var scope = {
		query: getQueryMethod(client, config),
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
		client.destroy()

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
		`SELECT attributes.* FROM attributes
			INNER JOIN devices ON devices.id = attributes.device_id
			WHERE devices.udid = :id
			ORDER BY attributes.\`order\``,
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
export let storage = (req, options, data, cb) => {
	cb('MySQL storage not yet supported.')
}
