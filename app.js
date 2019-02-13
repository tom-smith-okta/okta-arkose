////////////////////////////////////////////////////

require('dotenv').config()

const bodyParser = require("body-parser")

const express = require('express')

// const fs = require('fs')

const request = require("request")

///////////////////////////////////////////////////

// SET UP WEB SERVER
const app = express()

var port = process.env.PORT

app.use(bodyParser.urlencoded({ extended: false }))

app.use(express.static('public'))

app.listen(port, function () {
	console.log('App listening on port ' + port + '...');
})

//////////////////////////////////////////////////

// HOME PAGE
// app.get('/', function (req, res) {
// 	fs.readFile('html/index.html', 'utf8', (err, page) => {
// 		if (err) {
// 			console.log("error reading the index.html file")
// 		}

// 		page = page.replace(/{{OKTA_CLIENT_ID}}/g, process.env.OKTA_CLIENT_ID)
// 		page = page.replace(/{{OKTA_IDP_AUTHN}}/g, process.env.OKTA_IDP_AUTHN)
// 		page = page.replace(/{{OKTA_IDP_REG}}/g, process.env.OKTA_IDP_REG)
// 		page = page.replace(/{{OKTA_TENANT}}/g, process.env.OKTA_TENANT)
// 		page = page.replace(/{{REDIRECT_URI}}/g, process.env.REDIRECT_URI)

// 		res.send(page)
// 	})
// })

app.post('/evaluateAuthn', function (req, res) {
	console.dir(req.body)

	var options = {
		method: 'POST',
		url: 'https://okta-sift.oktapreview.com/api/v1/authn',
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
		if (error) throw new Error(error)

		console.log(response)

		console.log("The body is: " + response.body)

		if (response.body.status == "MFA_REQUIRED") {

			console.log("the user's factors are: ")

			console.dir(response.body._embedded.factors)

			for (factor in response.body._embedded.factors) {
				console.log("the factor is: " + factor)
			}

			// var stateToken = response.body.stateToken

			// console.log("the state token is: " + stateToken)

			// var url = "http://localhost:4536?stateToken=" + stateToken

			res.send("got some results")


			// res.redirect(url)
		}
		else if (response.body.sessionToken) {

			var sessionToken = response.body.sessionToken

			console.log("the session token is: " + sessionToken)

			var url = "https://okta-sift.oktapreview.com/oauth2/v1/authorize?client_id=0oaj9n8qnyWzhOvwv0h7&response_type=id_token&scope=openid&prompt=none&redirect_uri=http://localhost:4536&state=Af0ifjslDkj&nonce=n-0S6_WzA2Mj&sessionToken=" + sessionToken

			res.redirect(url)

		}
	})
})
