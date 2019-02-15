////////////////////////////////////////////////////

require('dotenv').config()

const bodyParser = require("body-parser")

const express = require('express')

var cors = require('cors')

const request = require("request")

///////////////////////////////////////////////////

// SET UP WEB SERVER
const app = express()

var port = process.env.PORT

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.use(express.static('public'))

app.listen(port, function () {
	console.log('App listening on port ' + port + '...');
})

//////////////////////////////////////////////////


/******************************************************/
// CORS stuff

var whitelist = ['http://localhost', 'http://localhost:9617', 'http://localhost:3378']

var corsOptions = {
	origin: function (origin, callback) {

		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true)
		} else {
			callback(new Error('Not allowed by CORS'))
		}
	}
}

app.options("/*", function(req, res, next){
	res.header('Access-Control-Allow-Origin', 'http://localhost:3378');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
	res.header('Access-Control-Allow-Credentials', true)
	res.header("Access-Control-Allow-Headers", "x-okta-user-agent-extended, x-okta-xsrftoken, content-type");
	res.sendStatus(200);
});
/*********************************************************/

app.get('/api/v1/sessions/me', cors(corsOptions), function (req, res) {
	var options = {
		method: 'GET',
		url: process.env.OKTA_TENANT + '/api/v1/sessions/me',
		headers: {
			 'Content-Type': 'application/json',
			 Accept: 'application/json'
		}
	}

	request(options, function (error, response, body) {
		console.log(body)

		if (error) throw new Error(error)

		console.log("the response is: ")

		console.dir(response)

		res.header('Access-Control-Allow-Credentials', true)

		console.log("the response from Okta is: ")

		console.dir(body)

		if (body.status == "SUCCESS") {
			console.log("user successfully logged in")

			res.status(200).json(body)
		}
		else {
			res.status(401).json(body)
		}
	})
})

app.post('/api/v1/authn', cors(corsOptions), function (req, res) {
	
	console.log("the request body is: ")

	console.dir(req.body)

	var err = {
		errorCode: "E0000004",
		errorSummary: "Authentication failed",
		errorLink: "E0000004",
		errorId: "noContextTokenProvided",
		errorCauses: []
	}

	// Check for the context token

	if (!req.body.contextData) {
		res.status(401).json(err)
	}
	else {

		var contextToken = req.body.contextData

		redeemContextToken(contextToken, function(error, response) {

			if (!response.solved) {
				err.errorId = "contextToken was no good"
				res.status(401).json(err)
			}
			else {
				var options = {
					method: 'POST',
					url: process.env.OKTA_TENANT + '/api/v1/authn',
					headers: {
						 'cache-control': 'no-cache',
						 'Content-Type': 'application/json',
						 Accept: 'application/json'
					},
					body: {
						username: req.body.username,
						password: req.body.password,
						options: {
							multiOptionalFactorEnroll: true,
							warnBeforePasswordExpired: true
						}
					},
					json: true
				}

				request(options, function (error, response, body) {
					console.log(body)

					if (error) throw new Error(error)

					res.header('Access-Control-Allow-Credentials', true)

					console.log("the response from Okta is: ")

					console.dir(body)

					if (body.status == "SUCCESS") {
						console.log("user successfully logged in")

						res.status(200).json(body)
					}
					else {
						res.status(401).json(body)
					}
				})
			}
		})
	}
})

app.get('/api/v1/authn', function (req, res) {
	// response.setHeader('Content-Type', 'text/html');
	// res.setHeader('', 'http://localhost:9617');

	res.send("got a response to the authn endpoint")
})

function redeemContextToken(contextToken, callback) {

	var url = "https://verify.arkoselabs.com/fc/v/"
	url += "?private_key=" + process.env.PRIVATE_KEY
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

