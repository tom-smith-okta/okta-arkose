////////////////////////////////////////////////////

require('dotenv').config()

const bodyParser = require('body-parser')

const express = require('express')

const fs = require('fs')

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

//////////////////////////////////////////////////

app.get('/', function (req, res) {

	fs.readFile('html/index.html', "utf8", (err, page) => {
		if (err) {
			console.log("error reading the index.html file")
		}

		page = page.replace(/{{ARKOSE_PUBLIC_KEY}}/g, process.env.ARKOSE_PUBLIC_KEY)
		page = page.replace(/{{OKTA_TENANT}}/g, process.env.OKTA_TENANT)
		page = page.replace(/{{APP_HOME}}/g, process.env.APP_HOME)
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

	var username = req.body.username

	// get the Okta user id
	getUserID(username, function(error, userID) {

		if (error) {
			console.log("Could not find an Okta ID for this user.")
			err.errorCauses.push("Could not find Okta ID for this user.")
			res.status(401).json(err)
			return
		}

		console.log("the user id is: " + userID)

		// move the user into a group that allows authn
		unlockUser(userID, function(error) {

			if (error) {
				err.errorCauses.push("Could not move Okta user into authn group.")
				res.status(401).json(err)
				return							
			}

			console.log("user moved into open group.")

			// attempt to authenticate the user vs. okta
			authenticateUser(username, req.body.password, function(error, statusCode, body) {
			
				if (error) {
					res.status(401).json(err)
					return						
				}

				console.log("the status code is " + statusCode)
				console.log("the body is: " + JSON.stringify(body))

				if (statusCode == 401) { // authn vs. okta failed
					res.status(statusCode).json(body)
					return
				}

				var contextToken = req.body.contextData

				redeemContextToken(contextToken, function(error, response) {

					if (!response.solved) {
						err.errorCauses.push("Context token did not pass inspection.")
						res.status(401).json(err)
						return
					}

					res.status(statusCode).json(body)

					// remove the user from the open group
					lockUser(userID, function(error) {

						if (error) { console.log(error) }

					})
				})
			})
		})
	})
})

function authenticateUser(username, password, callback) {

	var options = {
		method: 'POST',
		url: process.env.OKTA_TENANT + '/api/v1/authn',
		headers: {
			 'cache-control': 'no-cache',
			 'Content-Type': 'application/json',
			 Accept: 'application/json'
		},
		body: {
			username: username,
			password: password,
			options: {
				multiOptionalFactorEnroll: false,
				warnBeforePasswordExpired: true
			}
		},
		json: true
	}

	request(options, function (error, response, body) {

		if (error) return callback(error)

		console.log("the response from Okta is: ")

		console.dir(body)

		var status

		if (body.status == "SUCCESS") { status = 200 }
		else { status = 401 }

		return callback(null, status, body)
	})
}

function getUserID(username, callback) {

	var options = {
		method: 'GET',
		url: process.env.OKTA_TENANT + '/api/v1/users/' + username,
	 	headers: {
	    	'cache-control': 'no-cache',
	     	Authorization: 'SSWS ' + process.env.OKTA_API_TOKEN,
	     	'Content-Type': 'application/json',
	     	Accept: 'application/json'
	    }
	}

	request(options, function (error, response, body) {
		console.log("the result of getUserID is: ")

	  	console.log(body)

		var obj = JSON.parse(body)

		if (error) { return callback(error) }

		if (obj.errorCode) { return callback(obj.errorCode) }

		return callback(null, obj.id)
	})
}

function lockUser(userID, callback) {

	var options = {
		method: 'DELETE',
 		url: process.env.OKTA_TENANT + '/api/v1/groups/' + process.env.OKTA_OPEN_GROUP_ID + '/users/' + userID,
		headers: {
    		'cache-control': 'no-cache',
    		Authorization: 'SSWS ' + process.env.OKTA_API_TOKEN,
    		'Content-Type': 'application/json',
    		Accept: 'application/json'
    	}
    }

	request(options, function (error, response, body) {
		if (error) return callback(error)

	 	console.log(body)
	})
}

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

function unlockUser(userID, callback) {

	var options = {
		method: 'PUT',
		url: process.env.OKTA_TENANT + '/api/v1/groups/' + process.env.OKTA_OPEN_GROUP_ID + '/users/' + userID,
		headers: {
			'cache-control': 'no-cache',
	    	Authorization: 'SSWS ' + process.env.OKTA_API_TOKEN,
	    	'Content-Type': 'application/json',
	    	Accept: 'application/json'
	    }
	}

	request(options, function (error, response, body) {
		if (error) { return callback(error) }

		if (response.statusCode != 204) {
			return callback("error")
		}

		return callback(null)
	})
}
