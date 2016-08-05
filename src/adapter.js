import mysql from 'mysql'
import map from 'map-async'
import waterfall from 'async-waterfall'
import merge from 'merge'

const authQuery = `
	SELECT users.* FROM users
	INNER JOIN user_tokens ON user_tokens.user_id = users.id
	INNER JOIN user_devices ON user_devices.user_id = users.id
	INNER JOIN devices ON devices.id = user_devices.device_id
	WHERE user_tokens.token = :token
	AND devices.udid = :udid
	LIMIT 1`
const attributeQuery = `
	SELECT attributes.* FROM attributes
	INNER JOIN templates ON templates.id = attributes.template_id
	INNER JOIN devices ON devices.template_id = templates.id
	WHERE devices.udid = :udid
	ORDER BY attributes.\`order\``
const converterQuery = `
	SELECT type, value FROM converters
	WHERE attribute_id = :attribute_id
	ORDER BY \`order\``
const calibratorQuery = `
	SELECT fn FROM calibrators
	WHERE attribute_id = :attribute_id
	ORDER BY \`order\``
const validatorQuery = `
	SELECT type, value FROM validators
	WHERE attribute_id = :attribute_id
	ORDER BY \`order\``
const storageQuery = `
	REPLACE INTO ?? SET ?`

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
export let auth = (req, options, data, cb) => {
	var { config } = options
	var client = mysql.createConnection(config)

	getQueryMethod(client, config)(
		(options.sql || authQuery),
		req.auth,
		(err, rows) => {
			client.end()

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
		options,
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
		client.end()

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
		(this.options.attributeSql || attributeQuery),
		{ udid: deviceId },
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
			(this.options.converterSql || converterQuery),
			{ attribute_id: attr.id },
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
			(this.options.calibratorSql || calibratorQuery),
			{ attribute_id: attr.id },
			(err, rows) => {
				if (err) return cb(err)

				rows.forEach((row) => {
					attr.instance.addCalibrator(new Function(row.fn))
				})
				cb(null, attr)
			}
		)
	}, cb)
}
function setValidators (attributes, cb) {
	map(attributes, (attr, cb) => {
		this.query(
			(this.options.validatorSql || validatorQuery),
			{ attribute_id: attr.id },
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
	var id = data.getDeviceId()
	var { config } = options
	var client = mysql.createConnection(config)
	var values = merge(true, data.getData())
	var query  = (options.sql || storageQuery)
	var params = [id, values]

	Object.keys(values).forEach((key) => {
		if (key.toLowerCase().indexOf('timestamp') === -1) return
		query += ', `' + key + '` = FROM_UNIXTIME(?)'
		params.push(values[key])
		delete values[key]
	})

	getQueryMethod(client, config)(query, params, (err) => {
		client.end()

		if (err) return cb(err)

		cb()
	})
}
