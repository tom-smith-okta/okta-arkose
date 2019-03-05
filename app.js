////////////////////////////////////////////////////

require('dotenv').config()

const bodyParser = require('body-parser')

const express = require('express')

const fs = require('fs')

const OktaAuth = require('@okta/okta-auth-js')

const request = require('request')

///////////////////////////////////////////////////

// SET UP WEB SERVER
const app = express()

var port = process.env.PORT

app.use(bodyParser.json())

app.use(express.static('public'))

app.listen(port, function () {
	console.log('App listening on port ' + port + '...');
})

var config = {
	url: process.env.OKTA_TENANT
}

var authClient = new OktaAuth(config)

//////////////////////////////////////////////////

app.get('/', function (req, res) {

	fs.readFile('html/index.html', "utf8", (err, page) => {
		if (err) {
			console.log("error reading the index.html file")
		}

		page = page.replace(/{{ARKOSE_PUBLIC_KEY}}/g, process.env.ARKOSE_PUBLIC_KEY)
		page = page.replace(/{{OKTA_TENANT}}/g, process.env.OKTA_TENANT)
		page = page.replace(/{{APP_HOME}}/g, process.env.APP_HOME)

		// this is just a little hack to show an example username/password on the home
		// page of the public demo
		if (process.env.CREDS) {
			page = page.replace(/{{CREDS}}/g, process.env.CREDS)
		}
		else {
			page = page.replace(/{{CREDS}}/g, "")
		}
		res.send(page)
	})
})

app.post('/authn', function (req, res) {

	console.log("the request body is: ")

	console.dir(req.body)

	var err = {
		errorCode: "E0000004",
		errorSummary: "Authentication failed",
		errorLink: "E0000004",
		errorId: "",
		errorCauses: []
	}

	// Check for the context token
	// but don't redeem the context token until after Okta authn
	// if user mis-types password they can still use the same context token

	if (!req.body.contextData) {
		err.errorCauses.push("No context token included.")
		res.status(401).json(err)
		return
	}

	authClient.signIn({
		username: req.body.username,
		password: req.body.password
	})
	.then(function(transaction) {
		if (transaction.status === 'SUCCESS') {
			console.log("the transaction is: ")
			console.dir(transaction)

			console.log("the sessionToken is: " + transaction.sessionToken)

			var contextToken = req.body.contextData

			redeemContextToken(contextToken, function(error, response) {

				if (!response.solved) {
					err.errorCauses.push("Context token did not pass inspection.")
					res.status(401).json(err)
					return
				}

				res.json(transaction)
			})
		} else {
			throw 'We cannot handle the ' + transaction.status + ' status';
		}
	})
	.fail(function(err) {
		console.error(err);
	})
})

function redeemContextToken(contextToken, callback) {

	var url = "https://verify.arkoselabs.com/fc/v/"
	url += "?private_key=" + process.env.ARKOSE_PRIVATE_KEY
	url += "&session_token=" + contextToken

	var options = {
		method: 'GET',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'Content-Type': 'application/json',
			Accept: 'application/json'
		}
	}

	request(options, function (error, response, body) {
		if (error) throw new Error(error)

		console.log(body)

		return callback(null, JSON.parse(body))
	})
}
